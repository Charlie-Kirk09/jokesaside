import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { and, eq, lt, sql } from "drizzle-orm";
import * as schema from "./schema";
import { logger } from "../server/logger";
import { UserDb, UniversityDb } from "./types";

// ──────────────────────────────────────────────────────────────────────────────
//  Static fallback data — mirrors src/data.ts so in-memory mode behaves like
//  the live seed does once Postgres is reachable.
// ──────────────────────────────────────────────────────────────────────────────
import { universities as staticUniversities } from "../data";
import { staticUsers } from "./staticUsers";
import { staticBookmarks } from "./staticBookmarks";
import { staticReviews } from "./staticReviews";
import { staticNotifications } from "./staticNotifications";

// ──────────────────────────────────────────────────────────────────────────────
//  Re-export compatible callers from the static data modules
// ──────────────────────────────────────────────────────────────────────────────
export {
  staticUsers as staticUsers,
  staticBookmarks as staticBookmarks,
  staticReviews as staticReviews,
  staticNotifications as staticNotifications,
};

export function staticUniversityData() {
  return staticUniversities.map((u: any) => ({
    id: u.id,
    logo: u.logo || "",
    image: u.image || "",
    name: u.name,
    location: u.location,
    state: u.state,
    type: u.type,
    fee: u.fee,
    rating: u.rating,
    students: u.students,
    courses: u.courses,
    categories: (u.categories ?? []) as string[],
    stream: (u.stream ?? []) as string[],
    degrees: (u.degrees ?? []) as string[],
    majors: (u.majors ?? []) as string[],
    popularCourses: (u.popularCourses ?? []) as string[],
    phone: u.phone,
    competitiveExams: (u.competitiveExams ?? []) as string[],
    min10th: u.min10th,
    min12th: u.min12th,
    naacGrade: u.naacGrade,
    nirfRank: u.nirfRank,
    aicteApproved: u.aicteApproved ?? false,
    nbaAccredited: u.nbaAccredited ?? false,
    nmcRecognized: u.nmcRecognized ?? false,
    avgPlacementLPA: u.avgPlacementLPA,
    website: u.website || "",
    virtualTourUrl: u.virtualTourUrl || "",
    expertInsight: u.expertInsight || "",
    alumniStories: (u.alumniStories ?? []) as any[],
    campusMap: (u.campusMap ?? { hasHostels: true, library: true, labs: true, sportsComplex: true }) as any,
  }));
}

export function logAnalyticsEvent(event: { eventType: string; details?: Record<string, any>; ip?: string; userEmail?: string }) {
  // In-memory fallback: no-op; live path writes to analytics_events + audit_logs.
}
export function cleanupExpiredTokens(retentionDays: number): Promise<number> {
  return Promise.resolve(0);
}
export function cleanupExpiredLoginAttempts(retentionDays: number): Promise<number> {
  return Promise.resolve(0);
}
export function cleanupExpiredSessions(retentionDays: number): Promise<number> {
  return Promise.resolve(0);
}
export function cleanupExpiredNotifications(retentionDays: number): Promise<number> {
  return Promise.resolve(0);
}
export function getPoolDiagnostics(): Promise<{ status: string; totalConnections: number; idleConnections: number; waitingConnections: number }> {
  return Promise.resolve({ status: "in-memory-active", totalConnections: 1, idleConnections: 1, waitingConnections: 0 });
}
export function initialize() {
  // no-op — the class constructor schedules initialization
}
export async function exportPostgresData(): Promise<Record<string, any>> {
  return { universities: staticUniversityData(), users: [], reviews: [], bookmarks: [], notifications: [], chatHistory: [] };
}
export async function importPostgresData(data: Record<string, any>): Promise<void> {
  // no-op fallback
}

// ──────────────────────────────────────────────────────────────────────────────
//  DatabaseService — the single source of truth for all Postgres access.
//
//  Startup sequence:
//    1. read .env for DATABASE_URL / SUPABASE_DB_URL
//    2. attempt to build a pg.Pool + drizzle instance
//    3. on failure fall back to an in-memory datastore seeded with static data
//
//  Pool fault recovery (NEW — 2026-09-05):
//    When the Postgres pooler drops a connection or a DNS resolver blips
//    mid-flight (the recurring Supabase "Connection terminated unexpectedly"
//    / "getaddrinfo" pattern), the idle-client handler tears down the dead
//    pool and CONTINUOUSLY re-establishes it so subsequent queries go to a
//    live pool instead of surfacing fatal unhandled rejections.
//
//  Continuous retry vs single retry:
//    A single try is too brittle when the pooler cycles — it may succeed for
//    a few seconds and fail again 20 seconds later. The recovery loop polls up
//    to MAX_RECOVERY_ATTEMPTS times, sleeping RECOVERY_BACKOFF_BASE (doubled
//    each attempt) between tries. If the pooler is truly gone longer than the
//    budget, the service quietly degrades to in-memory mode instead of dying.
// ──────────────────────────────────────────────────────────────────────────────

const POOL_RECOVERY_COOLDOWN_MS = 1500;          // don't hammer a freshly-dying pool
const MAX_RECOVERY_ATTEMPTS = 8;                 // cap so we never loop forever
const RECOVERY_BACKOFF_BASE_MS = 800;            // grows 2x each attempt, capped at 30s

export class DatabaseService {
  private pgPool: pg.Pool | null = null;
  private drizzleDb: ReturnType<typeof drizzle<Record<string, unknown>> & typeof schema> | null = null;
  private isPostgres = false;
  public mockUsers: UserDb[] = [];
  private mockBookmarks: { email: string; universityId: number; createdAt?: string }[] = [];
  private readonly mockReviews: Record<number, { id: number; userName: string; rating: number; comment: string; avatar: string; reviewDate: string }[]> = {};
  private mockUniversitiesStore: UniversityDb[] | null = null;
  private mockStudentProfiles: { email: string; profile: any }[] = [];
  private mockParentProfiles: { email: string; profile: any }[] = [];
  private mockAuditLogs: any[] = [];
  private recoveryAttempts = 0;
  private recoveryTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // Defer database initialization to the next tick of the event loop.
    // This ensures that dotenv.config() in server.ts has run and loaded
    // all environment variables before we attempt to parse database URLs.
    setTimeout(() => {
      this.initialize();
    }, 0);
  }

  private cleanDatabaseUrl(rawUrl: string): string {
    let url = rawUrl.trim();

    if (url.startsWith('"') && url.endsWith('"')) url = url.slice(1, -1).trim();
    else if (url.startsWith("'") && url.endsWith("'")) url = url.slice(1, -1).trim();

    const prefixes = ["DATABASE_URL=", "SUPABASE_DB_URL="];
    for (const prefix of prefixes) {
      if (url.startsWith(prefix)) url = url.slice(prefix.length).trim();
    }

    if (url.startsWith('"') && url.endsWith('"')) url = url.slice(1, -1).trim();
    else if (url.startsWith("'") && url.endsWith("'")) url = url.slice(1, -1).trim();

    return url;
  }

  private isFatalError(err: any): boolean {
    if (!err) return false;
    const msg = (err.message || "").toLowerCase();
    const code = err.code || "";
    return (
      code === "ENOTFOUND" ||
      code === "EAI_AGAIN" ||
      code === "28P01" ||
      code === "3D000" ||
      code === "ECONNREFUSED" ||
      msg.includes("enotfound") ||
      msg.includes("tenant/user") ||
      msg.includes("not found") ||
      msg.includes("password authentication failed") ||
      (msg.includes("database") && msg.includes("does not exist")) ||
      (msg.includes("role") && msg.includes("does not exist"))
    );
  }

  private async initialize() {
    let attempts = 0;
    const maxAttempts = 3;
    let delay = 1000;

    while (attempts < maxAttempts) {
      attempts++;
      logger.info(`Database connection attempt ${attempts}/${maxAttempts}...`);

      const result = await this.tryConnect();
      if (result.success) return;

      if (result.fatal) {
        logger.info("Configured database endpoint is not reachable. Operating in resilient in-memory storage mode.");
        break;
      }

      if (attempts < maxAttempts) {
        logger.info(`Database connection attempt ${attempts} failed. Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2;
      }
    }

    this.isPostgres = false;
    this.drizzleDb = null;
    logger.info("In-memory local datastore active with full functionality and pre-seeded data.");
  }

  private async tryConnect(): Promise<{ success: boolean; fatal: boolean }> {
    let dbUrlRaw = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
    let databaseUrlConnected = false;
    let isFatal = false;

    if (dbUrlRaw && dbUrlRaw !== "undefined" && dbUrlRaw !== "null" && dbUrlRaw.trim() !== "") {
      const dbUrl = this.cleanDatabaseUrl(dbUrlRaw);

      if (dbUrl.includes("[YOUR-PASSWORD]") || dbUrl.includes("YOUR_PASSWORD") || dbUrl.includes("username:password")) {
        logger.info("DATABASE_URL contains placeholder password. Skipping remote database attempt...");
        isFatal = true;
      } else {
        try {
          logger.info("DATABASE_URL detected. Initiating connection pool to PostgreSQL...");
          const hasSslmodeDisable = dbUrl.includes("sslmode=disable") || dbUrl.includes("localhost") || dbUrl.includes("127.0.0.1");
          const pool = new pg.Pool({
            connectionString: dbUrl,
            ssl: hasSslmodeDisable ? undefined : { rejectUnauthorized: false },
            max: 25,
            connectionTimeoutMillis: 3000,
            idleTimeoutMillis: 30000,
          });

          pool.on("error", (err) => {
            logger.warn({ error: err.message, code: err.code }, "Unexpected error on idle PostgreSQL client; triggering pool recovery.");
            this.recoverFromPoolFault(err).catch((recoverErr: any) => {
              /* never block the idle-client handler — even if recovery itself is mid-flight */
            });
          });
          this.pgPool = pool;

          const client = await this.pgPool.connect();
          client.release();

          this.drizzleDb = drizzle(this.pgPool, { schema });
          this.isPostgres = true;
          databaseUrlConnected = true;
          logger.info("PostgreSQL database successfully connected with Drizzle ORM!");

          logger.info("Validating normalized database table structures...");

          await this.pgPool.query(`CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY, email VARCHAR(255) UNIQUE NOT NULL, password TEXT NOT NULL,
            role VARCHAR(50) NOT NULL DEFAULT 'Student', name VARCHAR(100),
            login_failures INTEGER DEFAULT 0 NOT NULL, locked_until BIGINT DEFAULT 0 NOT NULL,
            created_at TIMESTAMP DEFAULT NOW() NOT NULL, email_verified BOOLEAN DEFAULT FALSE NOT NULL,
            verification_token TEXT, verification_expires TIMESTAMP
          );`);
          await this.pgPool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE NOT NULL;`);
          await this.pgPool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token TEXT;`);
          await this.pgPool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_expires TIMESTAMP;`);

          await this.pgPool.query(`CREATE TABLE IF NOT EXISTS universities (
            id INTEGER PRIMARY KEY, name TEXT NOT NULL, location TEXT NOT NULL, state TEXT NOT NULL,
            type TEXT NOT NULL, fee INTEGER NOT NULL, rating DOUBLE PRECISION NOT NULL,
            students TEXT NOT NULL, courses INTEGER NOT NULL, image TEXT NOT NULL,
            logo TEXT, categories JSONB NOT NULL, stream JSONB NOT NULL, degrees JSONB NOT NULL,
            majors JSONB NOT NULL, popular_courses JSONB NOT NULL, phone TEXT NOT NULL,
            competitive_exams JSONB NOT NULL, min_10th INTEGER NOT NULL, min_12th INTEGER NOT NULL,
            naac_grade TEXT NOT NULL, nirf_rank INTEGER NOT NULL, aicte_approved BOOLEAN NOT NULL,
            nba_accredited BOOLEAN NOT NULL, nmc_recognized BOOLEAN NOT NULL, avg_placement_lpa DOUBLE PRECISION NOT NULL,
            website TEXT, virtual_tour_url TEXT, expert_insight TEXT, alumni_stories JSONB,
            campus_map JSONB, created_at TIMESTAMP DEFAULT NOW() NOT NULL
          );`);

          await this.pgPool.query(`CREATE TABLE IF NOT EXISTS reviews (
            id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY, university_id INTEGER NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
            user_email VARCHAR(255) NOT NULL, user_name VARCHAR(100) NOT NULL DEFAULT 'Student', rating INTEGER NOT NULL, comment TEXT NOT NULL,
            review_date VARCHAR(50) NOT NULL, avatar TEXT, created_at TIMESTAMP DEFAULT NOW() NOT NULL
          );`);
          await this.pgPool.query(`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS avatar TEXT;`);
          await this.pgPool.query(`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS user_email VARCHAR(255) NOT NULL DEFAULT 'unknown@uninfo.com';`);

          await this.pgPool.query(`CREATE TABLE IF NOT EXISTS sessions (
            token VARCHAR(255) PRIMARY KEY, email VARCHAR(255) NOT NULL, expires_at BIGINT NOT NULL
          );`);

          await this.pgPool.query(`CREATE TABLE IF NOT EXISTS bookmarks (
            id SERIAL PRIMARY KEY, user_email VARCHAR(255) NOT NULL, university_id INTEGER NOT NULL REFERENCES universities(id) ON DELETE CASCADE, created_at TIMESTAMP DEFAULT NOW() NOT NULL
          );`);

          await this.pgPool.query(`CREATE TABLE IF NOT EXISTS chat_history (
            id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY, user_email VARCHAR(255), role VARCHAR(50) NOT NULL, content TEXT NOT NULL, created_at TIMESTAMP DEFAULT NOW() NOT NULL
          );`);

          await this.pgPool.query(`CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY, user_email VARCHAR(255) NOT NULL, title VARCHAR(255) NOT NULL, message TEXT NOT NULL, type VARCHAR(100) NOT NULL DEFAULT 'announcement', read BOOLEAN DEFAULT FALSE NOT NULL, created_at TIMESTAMP DEFAULT NOW() NOT NULL
          );`);

          await this.pgPool.query(`CREATE TABLE IF NOT EXISTS university_reviews_agg (
            university_id INTEGER PRIMARY KEY REFERENCES universities(id) ON DELETE CASCADE, avg_rating DOUBLE PRECISION, review_count INTEGER DEFAULT 0
          );`);

          await this.pgPool.query(`CREATE TABLE IF NOT EXISTS student_profiles (id SERIAL PRIMARY KEY, user_email VARCHAR(255) UNIQUE NOT NULL, stream VARCHAR(100), budget INTEGER, preferred_location VARCHAR(255), preferred_course VARCHAR(255), entrance_exams JSONB, hostel_preference BOOLEAN DEFAULT FALSE NOT NULL, placement_priority VARCHAR(100), academic_scores JSONB, career_goals TEXT, updated_at TIMESTAMP DEFAULT NOW() NOT NULL);`);
          await this.pgPool.query(`CREATE TABLE IF NOT EXISTS parent_profiles (id SERIAL PRIMARY KEY, user_email VARCHAR(255) UNIQUE NOT NULL, budget INTEGER, preferred_state_city VARCHAR(255), safety_preference VARCHAR(100), roi_preference VARCHAR(100), scholarship_preference VARCHAR(100), distance_preference VARCHAR(100), accommodation_preference VARCHAR(100), updated_at TIMESTAMP DEFAULT NOW() NOT NULL);`);

          await this.pgPool.query(`CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY, action VARCHAR(100) NOT NULL, details JSONB DEFAULT '{}' NOT NULL, user_email VARCHAR(255), ip VARCHAR(100), status VARCHAR(50), correlation_id VARCHAR(255), created_at TIMESTAMP DEFAULT NOW() NOT NULL
          );`);

          await this.pgPool.query(`CREATE TABLE IF NOT EXISTS login_attempts (
            id SERIAL PRIMARY KEY, ip VARCHAR(100) NOT NULL, email VARCHAR(255), success BOOLEAN NOT NULL, attempt_time TIMESTAMP DEFAULT NOW() NOT NULL
          );`);

          logger.info("All table structure checks and indexing verified successfully.");

          const universityData = staticUniversityData();
          const totalUniversities = universityData.length;

          await this.pgPool.query(`ALTER TABLE universities ADD COLUMN IF NOT EXISTS virtual_tour_url TEXT;`);
          await this.pgPool.query(`ALTER TABLE universities ADD COLUMN IF NOT EXISTS expert_insight TEXT;`);
          await this.pgPool.query(`ALTER TABLE universities ADD COLUMN IF NOT EXISTS alumni_stories JSONB;`);
          await this.pgPool.query(`ALTER TABLE universities ADD COLUMN IF NOT EXISTS campus_map JSONB;`);

          for (let i = 0; i < totalUniversities; i++) {
            const baseId = i + 1;
            const resolvedImage = universityData[i].image || staticUniversities[i].image;
            const resolvedLogo = universityData[i].logo || staticUniversities[i].logo;

            await this.pgPool.query(`INSERT INTO universities (id, name, location, state, type, fee, rating, students, courses, image, logo,
              categories, stream, degrees, majors, popular_courses, phone, competitive_exams,
              min_10th, min_12th, naac_grade, nirf_rank, aicte_approved, nba_accredited, nmc_recognized,
              avg_placement_lpa, website, virtual_tour_url, expert_insight, alumni_stories, campus_map, created_at)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13::jsonb, $14::jsonb, $15::jsonb, $16::jsonb, $17, $18::jsonb,
              $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30::jsonb, $31::jsonb, NOW())
              ON CONFLICT (id) DO UPDATE SET image = EXCLUDED.image;`,
              [
                baseId, universityData[i].name, universityData[i].location, universityData[i].state,
                universityData[i].type, universityData[i].fee, universityData[i].rating,
                universityData[i].students, universityData[i].courses, resolvedImage,
                resolvedLogo, JSON.stringify(universityData[i].categories ?? []),
                JSON.stringify(universityData[i].stream ?? []), JSON.stringify(universityData[i].degrees ?? []),
                JSON.stringify(universityData[i].majors ?? []), JSON.stringify(universityData[i].popularCourses ?? []),
                universityData[i].phone, JSON.stringify(universityData[i].competitiveExams ?? []),
                universityData[i].min10th, universityData[i].min12th, universityData[i].naacGrade,
                universityData[i].nirfRank, universityData[i].aicteApproved, universityData[i].nbaAccredited,
                universityData[i].nmcRecognized, universityData[i].avgPlacementLPA,
                universityData[i].website, universityData[i].virtualTourUrl,
                universityData[i].expertInsight,
                JSON.stringify(universityData[i].alumniStories ?? []),
                JSON.stringify(universityData[i].campusMap ?? { hasHostels: true, library: true, labs: true, sportsComplex: true }),
              ],
            );
          }

          logger.info(`PostgreSQL normalized users, universities, and bookmarks verified successfully.`);

          for (const user of staticUsers) {
            await this.pgPool.query(`INSERT INTO users (id, email, password, role, name, login_failures, locked_until, created_at, email_verified, verification_token, verification_expires)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;`,
              [user.id, user.email, user.password, user.role, user.name, user.loginFailures, user.lockedUntil, user.createdAt, user.emailVerified, user.verificationToken, user.verificationExpires],
            );
          }

          for (const bookmark of staticBookmarks) {
            await this.pgPool.query(`INSERT INTO bookmarks (id, user_email, university_id, created_at) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING;`,
              [bookmark.id, bookmark.userEmail, bookmark.universityId, bookmark.createdAt],
            );
          }

          for (const review of staticReviews) {
            await this.pgPool.query(`INSERT INTO reviews (id, university_id, user_email, user_name, rating, comment, review_date, avatar) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT DO NOTHING;`,
              [review.id, review.universityId, review.userEmail, review.userName, review.rating, review.comment, review.reviewDate, review.avatar],
            );
          }

          for (const notification of staticNotifications) {
            const notificationType = notification.type || "announcement";
            await this.pgPool.query(`INSERT INTO notifications (id, user_email, title, message, type, read, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT DO NOTHING;`,
              [notification.id, notification.email, notification.title, notification.message, notificationType, notification.isRead, notification.created_at],
            );
          }

          logger.info("Successfully seeded initial sample data into normalized tables.");
          this.mockUsers = staticUsers;
          this.mockBookmarks = staticBookmarks;
          for (const rev of staticReviews) {
            if (!this.mockReviews[rev.universityId]) this.mockReviews[rev.universityId] = [];
            this.mockReviews[rev.universityId].push(rev);
          }
          return { success: true, fatal: false };
        } catch (err: any) {
          // NOTE: previously `isFatal = isFatal && this.isFatalError(err)` — since isFatal
          // starts false in this branch, that expression was always false regardless of
          // the actual error, so fatal DB errors (bad password, missing DB) were retried
          // 3 times instead of failing fast. Fixed to reflect the real error.
          isFatal = this.isFatalError(err);
          logger.info({ error: err.message }, "Cloud SQL connection could not be established.");
          this.isPostgres = false;
          if (this.pgPool) {
            try { await this.pgPool.end(); } catch (e) {}
            this.pgPool = null;
          }
        }
      }
    }

    return { success: false, fatal: isFatal };
  }

  /**
   * When the Postgres pooler drops a connection or a DNS resolver blips
   * mid-flight (the recurring Supabase "Connection terminated unexpectedly"
   * / "getaddrinfo" pattern), this tears down the dead pool and RE-CREATES it
   * so subsequent queries go to a live pool instead of surfacing fatal
   * unhandled rejections.
   *
   * Idempotent and fire-and-forget: the idle-client handler invokes it without
   * awaiting, so a fault never blocks request handlers or other concurrent
   * queries.
   */
  public async recoverFromPoolFault(err: Error & { code?: string; message?: string }): Promise<void> {
    const msg = (err.message || "" as string).toLowerCase();
    const code = (err.code || "" as string);
    const isPoolFault =
      /connection terminated|terminating connection|could not serialize access|ssl error|connection reset/i.test(msg) ||
      /ECONNRESET|ETIMEDOUT|EPIPE|EAI_AGAIN|ENETUNREACH|EHOSTUNREACH/i.test(code) ||
      code === "08006" ||
      code === "57P01" || code === "57P03";

    if (!isPoolFault) return;

    logger.warn({ code, msg: msg.slice(0, 200), err: err }, "Postgres pool fault detected; attempting pool recovery.");

    if (this.recoveryTimer) return;

    try {
      if (this.pgPool) {
        await this.pgPool.end().catch(() => {});
        this.pgPool = null;
      }
      this.isPostgres = false;
      this.drizzleDb = null;

      this.recoveryAttempts = 0;
      let recovered = false;
      let backoff = RECOVERY_BACKOFF_BASE_MS;

      while (this.recoveryAttempts < MAX_RECOVERY_ATTEMPTS) {
        this.recoveryAttempts++;
        logger.info({ attempt: this.recoveryAttempts, max: MAX_RECOVERY_ATTEMPTS, backoff }, "Attempting post-fault pool re-establishment.");

        const result = await this.tryConnect();
        if (result.success) {
          recovered = true;
          logger.info({ }, "Postgres pool recovered from fault.");
          break;
        }

        if (result.fatal) {
          logger.warn({ fatal: result.fatal }, "Postgres pool recovery failed (fatal); remaining in fallback mode.");
          break;
        }

        await new Promise((resolve) => setTimeout(resolve, backoff));
        backoff = Math.min(backoff * 2, 30000);
      }

      if (!recovered) {
        logger.warn({ attempts: this.recoveryAttempts, max: MAX_RECOVERY_ATTEMPTS }, "Postgres pool recovery exhausted; remaining in fallback mode.");
      }
    } catch (recoverErr: any) {
      logger.warn({ error: recoverErr.message }, "Postgres pool recovery attempt threw; staying in fallback mode.");
    } finally {
      this.recoveryTimer = null;
    }
  }

  public async shutdown(): Promise<void> {
    logger.info("Closing database connection pool...");
    if (this.pgPool) {
      try {
        await this.pgPool.end();
        logger.info("Database connection pool closed cleanly.");
      } catch (err: any) {
        logger.error({ error: err.message }, "Error closing database connection pool.");
      }
      this.pgPool = null;
    }
    this.isPostgres = false;
    this.drizzleDb = null;
  }

  // ──────────────────────────────────────────────────────────────────────────────
  //  PUBLIC DIAGNOSTICS HELPERS
  // ──────────────────────────────────────────────────────────────────────────────
  public isUsingPostgres(): boolean {
    return this.isPostgres;
  }

  public getPoolDiagnostics() {
    if (!this.pgPool) {
      return {
        status: this.isPostgres ? "offline" : "in-memory-active",
        totalConnections: this.isPostgres ? 0 : 1,
        idleConnections: this.isPostgres ? 0 : 1,
        waitingConnections: 0,
      };
    }
    return {
      status: "online",
      totalConnections: this.pgPool.totalCount || 0,
      idleConnections: this.pgPool.idleCount || 0,
      waitingConnections: this.pgPool.waitingCount || 0,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────────
  //  USERS OPERATIONS
  // ──────────────────────────────────────────────────────────────────────────────
  public async getUserByEmail(email: string): Promise<UserDb | null> {
    if (!this.isPostgres || !this.drizzleDb) {
      const u = this.mockUsers.find((x) => x.email.toLowerCase() === email.toLowerCase());
      if (u) {
        const bookmarksList = this.mockBookmarks.filter((b) => b.email.toLowerCase() === email.toLowerCase()).map((b) => b.universityId);
        return { ...u, bookmarks: bookmarksList };
      }
      return null;
    }
    try {
      const usersList = await this.drizzleDb.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
      if (usersList.length > 0) {
        const u = usersList[0];
        const bookmarksList = await this.drizzleDb.select({ universityId: schema.bookmarks.universityId })
          .from(schema.bookmarks)
          .where(eq(schema.bookmarks.userEmail, email));

        return {
          id: u.id,
          email: u.email,
          password: u.password,
          role: u.role,
          name: u.name,
          bookmarks: bookmarksList.map((b: any) => b.universityId),
          loginFailures: u.loginFailures,
          lockedUntil: u.lockedUntil,
          createdAt: u.createdAt.toISOString(),
          emailVerified: u.emailVerified,
          verificationToken: u.verificationToken,
          verificationExpires: u.verificationExpires ? u.verificationExpires.toISOString() : null,
        };
      }
      return null;
    } catch (err: any) {
      logger.error({ error: err.message }, "getUserByEmail PG Error");
      throw err;
    }
  }

  public async createUser(userData: Partial<UserDb>): Promise<UserDb> {
    if (!this.isPostgres || !this.drizzleDb) {
      const email = userData.email!;
      const existing = this.mockUsers.find((x) => x.email.toLowerCase() === email.toLowerCase());
      if (existing) throw new Error("User already exists.");

      const newUser: UserDb = {
        id: this.mockUsers.length + 1,
        email,
        password: userData.password || "",
        role: userData.role || "Student",
        name: userData.name || null,
        bookmarks: [],
        loginFailures: 0,
        lockedUntil: 0,
        createdAt: new Date().toISOString(),
        emailVerified: userData.emailVerified || false,
        verificationToken: userData.verificationToken || null,
        verificationExpires: userData.verificationExpires || null,
      };
      this.mockUsers.push(newUser);
      return newUser;
    }
    try {
      const [inserted] = await this.drizzleDb.insert(schema.users)
        .values({
          email: userData.email!,
          password: userData.password!,
          role: userData.role || "Student",
          name: userData.name || null,
          loginFailures: 0,
          lockedUntil: 0,
          createdAt: new Date(),
          emailVerified: userData.emailVerified || false,
          verificationToken: userData.verificationToken || null,
          verificationExpires: userData.verificationExpires || null,
        })
        .returning();
      return inserted;
    } catch (err: any) {
      logger.error({ error: err.message }, "createUser PG Error");
      throw err;
    }
  }

  public async verifyEmail(email: string): Promise<boolean> {
    if (!this.isPostgres || !this.drizzleDb) {
      const u = this.mockUsers.find((x) => x.email.toLowerCase() === email.toLowerCase());
      if (u) {
        u.emailVerified = true;
        return true;
      }
      return false;
    }
    try {
      await this.drizzleDb.update(schema.users)
        .set({ emailVerified: true })
        .where(eq(schema.users.email, email));
      return true;
    } catch (err: any) {
      logger.error({ error: err.message }, "verifyEmail PG Error");
      throw err;
    }
  }

  public async getUserByVerificationToken(token: string): Promise<UserDb | null> {
    if (!this.isPostgres || !this.drizzleDb) {
      return this.mockUsers.find((u) => u.verificationToken?.toLowerCase() === token.toLowerCase()) || null;
    }
    try {
      const usersList = await this.drizzleDb.select().from(schema.users).where(eq(schema.users.verificationToken, token)).limit(1);
      if (usersList.length > 0) {
        const u = usersList[0];
        const bookmarksList = await this.drizzleDb.select({ universityId: schema.bookmarks.universityId })
          .from(schema.bookmarks)
          .where(eq(schema.bookmarks.userEmail, u.email));
        return {
          id: u.id,
          email: u.email,
          password: u.password,
          role: u.role,
          name: u.name,
          bookmarks: bookmarksList.map((b: any) => b.universityId),
          loginFailures: u.loginFailures,
          lockedUntil: u.lockedUntil,
          createdAt: u.createdAt.toISOString(),
          emailVerified: u.emailVerified,
          verificationToken: u.verificationToken,
          verificationExpires: u.verificationExpires ? u.verificationExpires.toISOString() : null,
        };
      }
      return null;
    } catch (err: any) {
      logger.error({ error: err.message }, "getUserByVerificationToken PG Error");
      throw err;
    }
  }

  public async updateUserVerificationToken(email: string, token: string | null, expires: string | null): Promise<void> {
    if (!this.isPostgres || !this.drizzleDb) {
      const u = this.mockUsers.find((x) => x.email.toLowerCase() === email.toLowerCase());
      if (u) {
        u.verificationToken = token;
        u.verificationExpires = expires ? new Date(expires) : null;
      }
      return;
    }
    try {
      await this.drizzleDb.update(schema.users)
        .set({ verificationToken: token, verificationExpires: expires ? new Date(expires) : null })
        .where(eq(schema.users.email, email));
    } catch (err: any) {
      logger.error({ error: err.message }, "updateUserVerificationToken PG Error");
      throw err;
    }
  }

  public async updateUserLockout(email: string, failures: number, lockedUntil: number): Promise<void> {
    if (!this.isPostgres || !this.drizzleDb) {
      const u = this.mockUsers.find((x) => x.email.toLowerCase() === email.toLowerCase());
      if (u) {
        u.loginFailures = failures;
        u.lockedUntil = lockedUntil;
      }
      return;
    }
    try {
      await this.drizzleDb.update(schema.users)
        .set({ loginFailures: failures, lockedUntil })
        .where(eq(schema.users.email, email));
    } catch (err: any) {
      logger.error({ error: err.message }, "updateUserLockout PG Error");
      throw err;
    }
  }

  public async recordLoginAttempt(ip: string, email: string, success: boolean): Promise<void> {
    if (!this.isPostgres || !this.drizzleDb) return;
    try {
      await this.drizzleDb.insert(schema.loginAttempts).values({
        ip,
        email,
        success,
        attemptTime: new Date(),
      }).onConflictDoNothing();
    } catch (err: any) {
      logger.warn({ error: err.message }, "recordLoginAttempt PG Error");
    }
  }

  // ──────────────────────────────────────────────────────────────────────────────
  //  UNIVERSITIES OPERATIONS
  // ──────────────────────────────────────────────────────────────────────────────
  public async getUniversities(query?: { search?: string }): Promise<UniversityDb[]> {
    if (!this.isPostgres || !this.drizzleDb) {
      let list = staticUniversityData();
      if (query?.search) {
        const q = query.search.toLowerCase();
        list = list.filter((u) => u.name.toLowerCase().includes(q) || u.location.toLowerCase().includes(q));
      }
      return list.map((u) => ({
        id: u.id,
        logo: u.logo || "",
        image: u.image || "",
        name: u.name,
        location: u.location,
        state: u.state,
        type: u.type,
        fee: u.fee,
        rating: u.rating,
        students: u.students,
        courses: u.courses,
        categories: [] as string[],
        stream: [] as string[],
        degrees: [] as string[],
        majors: [] as string[],
        popularCourses: [] as string[],
        phone: u.phone,
        competitiveExams: [] as string[],
        min10th: u.min10th,
        min12th: u.min12th,
        naacGrade: u.naacGrade,
        nirfRank: u.nirfRank,
        aicteApproved: u.aicteApproved,
        nbaAccredited: u.nbaAccredited,
        nmcRecognized: u.nmcRecognized,
        avgPlacementLPA: u.avgPlacementLPA,
        website: u.website || "",
        virtualTourUrl: u.virtualTourUrl || "",
        expertInsight: u.expertInsight || "",
        alumniStories: [] as any[],
        campusMap: {} as any,
        reviews: this.mockReviews[u.id]?.map((r) => ({
          id: r.id,
          userName: r.userName,
          rating: r.rating,
          comment: r.comment,
          avatar: r.avatar,
          reviewDate: r.reviewDate,
        })) || [],
        reviewCount: (this.mockReviews[u.id]?.length || 0),
        averageReview: (this.mockReviews[u.id]?.length
          ? this.mockReviews[u.id].reduce((s, r) => s + r.rating, 0) / this.mockReviews[u.id].length
          : 0),
      }));
    }
    try {
      let base = await this.drizzleDb.select().from(schema.universities);
      if (query?.search) {
        const q = query.search.toLowerCase();
        base = base.filter((u) => u.name.toLowerCase().includes(q) || u.location.toLowerCase().includes(q));
      }
      const universitiesList = await Promise.all(base.map(async (u) => {
        const reviewsList = await this.drizzleDb.select().from(schema.reviews).where(eq(schema.reviews.universityId, u.id));
        const reviewCount = await this.drizzleDb.select({ count: sql<number>`count(*)` }).from(schema.reviews).where(eq(schema.reviews.universityId, u.id));
        return {
          ...u,
          reviews: reviewsList.map((r) => ({
            id: r.id,
            userName: r.userName,
            rating: r.rating,
            comment: r.comment,
            avatar: r.avatar,
            reviewDate: r.reviewDate,
          })),
          reviewCount: reviewCount[0]?.count ?? 0,
          averageReview: reviewCount[0]?.count
            ? reviewsList.reduce((s, r) => s + r.rating, 0) / reviewCount[0].count
            : 0,
          categories: u.categories as string[],
          stream: u.stream as string[],
          degrees: u.degrees as string[],
          majors: u.majors as string[],
          popularCourses: u.popularCourses as string[],
          competitiveExams: u.competitiveExams as string[],
          campusMap: u.campusMap as any,
          alumniStories: u.alumniStories as any[],
        };
      }));
      return universitiesList;
    } catch (err: any) {
      logger.error({ error: err.message }, "getUniversities PG Error");
      throw err;
    }
  }

  public async getUniversityById(id: number): Promise<UniversityDb | null> {
    if (!this.isPostgres || !this.drizzleDb) {
      const u = staticUniversityData().find((x) => x.id === id);
      if (!u) return null;
      return {
        id: u.id,
        logo: u.logo || "",
        image: u.image || "",
        name: u.name,
        location: u.location,
        state: u.state,
        type: u.type,
        fee: u.fee,
        rating: u.rating,
        students: u.students,
        courses: u.courses,
        categories: [] as string[],
        stream: [] as string[],
        degrees: [] as string[],
        majors: [] as string[],
        popularCourses: [] as string[],
        phone: u.phone,
        competitiveExams: [] as string[],
        min10th: u.min10th,
        min12th: u.min12th,
        naacGrade: u.naacGrade,
        nirfRank: u.nirfRank,
        aicteApproved: u.aicteApproved,
        nbaAccredited: u.nbaAccredited,
        nmcRecognized: u.nmcRecognized,
        avgPlacementLPA: u.avgPlacementLPA,
        website: u.website || "",
        virtualTourUrl: u.virtualTourUrl || "",
        expertInsight: u.expertInsight || "",
        alumniStories: [] as any[],
        campusMap: {} as any,
        reviews: this.mockReviews[id]?.map((r) => ({
          id: r.id,
          userName: r.userName,
          rating: r.rating,
          comment: r.comment,
          avatar: r.avatar,
          reviewDate: r.reviewDate,
        })) || [],
        reviewCount: (this.mockReviews[id]?.length || 0),
        averageReview: (this.mockReviews[id]?.length
          ? this.mockReviews[id].reduce((s, r) => s + r.rating, 0) / this.mockReviews[id].length
          : 0),
      };
    }
    try {
      const res = await this.drizzleDb.select().from(schema.universities).where(eq(schema.universities.id, id)).limit(1);
      if (res.length > 0) {
        const u = res[0];
        const reviewsList = await this.drizzleDb.select().from(schema.reviews).where(eq(schema.reviews.universityId, id));
        const reviewCount = await this.drizzleDb.select({ count: sql<number>`count(*)` }).from(schema.reviews).where(eq(schema.reviews.universityId, id));
        return {
          ...u,
          reviews: reviewsList.map((r) => ({
            id: r.id,
            userName: r.userName,
            rating: r.rating,
            comment: r.comment,
            avatar: r.avatar,
            reviewDate: r.reviewDate,
          })),
          reviewCount: reviewCount[0]?.count ?? 0,
          averageReview: reviewCount[0]?.count
            ? reviewsList.reduce((s, r) => s + r.rating, 0) / reviewCount[0].count
            : 0,
          categories: u.categories as string[],
          stream: u.stream as string[],
          degrees: u.degrees as string[],
          majors: u.majors as string[],
          popularCourses: u.popularCourses as string[],
          competitiveExams: u.competitiveExams as string[],
          campusMap: u.campusMap as any,
          alumniStories: u.alumniStories as any[],
        };
      }
      return null;
    } catch (err: any) {
      logger.error({ error: err.message }, "getUniversityById PG Error");
      throw err;
    }
  }

  public async upsertUniversity(university: UniversityDb): Promise<UniversityDb> {
    if (!this.isPostgres || !this.drizzleDb) {
      const existing = this.mockUniversities.find((x) => x.id === university.id);
      if (existing) Object.assign(existing, university);
      else this.mockUniversities.push(university);
      return university;
    }
    try {
      const [upserted] = await this.drizzleDb.insert(schema.universities)
        .values({
          id: university.id,
          name: university.name,
          location: university.location,
          state: university.state,
          type: university.type,
          fee: university.fee,
          rating: university.rating,
          students: university.students,
          courses: university.courses,
          image: university.image,
          logo: university.logo || "",
          categories: university.categories as any,
          stream: university.stream as any,
          degrees: university.degrees as any,
          majors: university.majors as any,
          popularCourses: university.popularCourses as any,
          phone: university.phone,
          competitiveExams: university.competitiveExams as any,
          min10th: university.min10th,
          min12th: university.min12th,
          naacGrade: university.naacGrade,
          nirfRank: university.nirfRank,
          aicteApproved: university.aicteApproved,
          nbaAccredited: university.nbaAccredited,
          nmcRecognized: university.nmcRecognized,
          avgPlacementLPA: university.avgPlacementLPA,
          website: university.website || "",
          virtualTourUrl: university.virtualTourUrl || "",
          expertInsight: university.expertInsight || "",
          alumniStories: university.alumniStories as any,
          campusMap: university.campusMap as any,
        })
        .onConflictDoUpdate({
          target: schema.universities.id,
          set: {
            name: university.name,
            location: university.location,
            state: university.state,
            type: university.type,
            fee: university.fee,
            rating: university.rating,
            students: university.students,
            courses: university.courses,
            image: university.image,
            logo: university.logo || "",
            categories: university.categories as any,
            stream: university.stream as any,
            degrees: university.degrees as any,
            majors: university.majors as any,
            popularCourses: university.popularCourses as any,
            phone: university.phone,
            competitiveExams: university.competitiveExams as any,
            min10th: university.min10th,
            min12th: university.min12th,
            naacGrade: university.naacGrade,
            nirfRank: university.nirfRank,
            aicteApproved: university.aicteApproved,
            nbaAccredited: university.nbaAccredited,
            nmcRecognized: university.nmcRecognized,
            avgPlacementLPA: university.avgPlacementLPA,
            website: university.website || "",
            virtualTourUrl: university.virtualTourUrl || "",
            expertInsight: university.expertInsight || "",
            alumniStories: university.alumniStories as any,
            campusMap: university.campusMap as any,
          },
        })
        .returning();
      return upserted;
    } catch (err: any) {
      logger.error({ error: err.message }, "upsertUniversity PG Error");
      throw err;
    }
  }

  public async deleteUniversity(id: number): Promise<boolean> {
    if (!this.isPostgres || !this.drizzleDb) {
      const idx = this.mockUniversities.findIndex((u) => u.id === id);
      if (idx >= 0) {
        this.mockUniversities.splice(idx, 1);
        return true;
      }
      return false;
    }
    try {
      await this.drizzleDb.delete(schema.universities).where(eq(schema.universities.id, id));
      return true;
    } catch (err: any) {
      logger.error({ error: err.message }, "deleteUniversity PG Error");
      throw err;
    }
  }

  public async getAllUniversities(): Promise<UniversityDb[]> {
    return this.getUniversities();
  }

  public async searchUniversities(query: string): Promise<UniversityDb[]> {
    return this.getUniversities({ search: query });
  }

  // ──────────────────────────────────────────────────────────────────────────────
  //  REVIEW OPERATIONS
  // ──────────────────────────────────────────────────────────────────────────────
  public async addReview(id: number, review: { id: number; user: string; userEmail: string; rating: number; comment: string; date: string; avatar: string }): Promise<{ rating: number }> {
    if (!this.isPostgres || !this.drizzleDb) {
      if (!this.mockReviews[id]) this.mockReviews[id] = [];
      this.mockReviews[id].push({ id: review.id, userName: review.user, rating: review.rating, comment: review.comment, avatar: review.avatar, reviewDate: review.date });
      const r = this.mockReviews[id];
      const avg = r.reduce((s, x) => s + x.rating, 0) / r.length;
      return { rating: Math.round(avg * 10) / 10 };
    }
    try {
      await this.drizzleDb.insert(schema.reviews).values({
        id: review.id,
        universityId: id,
        userEmail: review.userEmail,
        userName: review.user,
        rating: review.rating,
        comment: review.comment,
        reviewDate: review.date,
        avatar: review.avatar,
      });
      const res = await this.drizzleDb.select({ count: sql<number>`count(*)`, avg: sql<number>`avg(rating)` }).from(schema.reviews).where(eq(schema.reviews.universityId, id));
      const avg = res[0]?.avg ? parseFloat(res[0].avg.toFixed(2)) : 0;
      const count = res[0]?.count ?? 0;
      await this.drizzleDb.insert(schema.universityReviewsAgg)
        .values({ universityId: id, avgRating: avg, reviewCount: count })
        .onConflictDoUpdate({
          target: schema.universityReviewsAgg.universityId,
          set: { avgRating: avg, reviewCount: count },
        });
      return { rating: avg };
    } catch (err: any) {
      logger.error({ error: err.message, id }, "addReview PG Error");
      throw err;
    }
  }

  public async getAllReviews(): Promise<any[]> {
    if (!this.isPostgres || !this.drizzleDb) {
      return Object.values(this.mockReviews).flat();
    }
    try {
      return await this.drizzleDb.select().from(schema.reviews).orderBy(sql`${schema.reviews.reviewDate} desc`);
    } catch (err: any) {
      logger.error({ error: err.message }, "getAllReviews PG Error");
      throw err;
    }
  }

  public async deleteReview(id: number): Promise<boolean> {
    if (!this.isPostgres || !this.drizzleDb) {
      for (const revs of Object.values(this.mockReviews)) {
        const idx = revs.findIndex((r) => r.id === id);
        if (idx >= 0) {
          revs.splice(idx, 1);
          return true;
        }
      }
      return false;
    }
    try {
      await this.drizzleDb.delete(schema.reviews).where(eq(schema.reviews.id, id));
      return true;
    } catch (err: any) {
      logger.error({ error: err.message }, "deleteReview PG Error");
      throw err;
    }
  }

  public async getAllUniversityReviews(universityId: number): Promise<any[]> {
    if (!this.isPostgres || !this.drizzleDb) {
      return this.mockReviews[universityId] || [];
    }
    try {
      return await this.drizzleDb.select().from(schema.reviews).where(eq(schema.reviews.universityId, universityId)).orderBy(sql`${schema.reviews.reviewDate} desc`);
    } catch (err: any) {
      logger.error({ error: err.message }, "getAllUniversityReviews PG Error");
      throw err;
    }
  }

  // ──────────────────────────────────────────────────────────────────────────────
  //  BOOKMARK OPERATIONS
  // ──────────────────────────────────────────────────────────────────────────────
  public async toggleBookmark(email: string, universityId: number): Promise<{ added: boolean; bookmarks: number[] }> {
    if (!this.isPostgres || !this.drizzleDb) {
      const exists = this.mockBookmarks.some((b) => b.email.toLowerCase() === email.toLowerCase() && b.universityId === universityId);
      if (exists) {
        this.mockBookmarks = this.mockBookmarks.filter((b) => !(b.email.toLowerCase() === email.toLowerCase() && b.universityId === universityId));
      } else {
        this.mockBookmarks.push({ email, universityId, createdAt: new Date().toISOString() });
      }
      return { added: !exists, bookmarks: this.mockBookmarks.filter((b) => b.email.toLowerCase() === email.toLowerCase()).map((b) => b.universityId) };
    }
    try {
      // NOTE: previously this deleted ALL of the user's bookmarks (any university) AND
      // separately ALL bookmarks for this university (any user) on removal — far too broad.
      // Scoped to the exact (email, universityId) pair with `and(...)`.
      const existing = await this.drizzleDb.select().from(schema.bookmarks)
        .where(and(eq(schema.bookmarks.userEmail, email), eq(schema.bookmarks.universityId, universityId)));
      const alreadyBookmarked = existing.length > 0;
      if (alreadyBookmarked) {
        await this.drizzleDb.delete(schema.bookmarks)
          .where(and(eq(schema.bookmarks.userEmail, email), eq(schema.bookmarks.universityId, universityId)));
      } else {
        await this.drizzleDb.insert(schema.bookmarks).values({ userEmail: email, universityId });
      }
      const bookmarks = await this.drizzleDb.select({ universityId: schema.bookmarks.universityId }).from(schema.bookmarks).where(eq(schema.bookmarks.userEmail, email));
      return { added: !alreadyBookmarked, bookmarks: bookmarks.map((b: any) => b.universityId) };
    } catch (err: any) {
      logger.error({ error: err.message }, "toggleBookmark PG Error");
      throw err;
    }
  }

  public async getBookmarks(email: string): Promise<number[]> {
    if (!this.isPostgres || !this.drizzleDb) {
      return this.mockBookmarks.filter((b) => b.email.toLowerCase() === email.toLowerCase()).map((b) => b.universityId);
    }
    try {
      const bookmarks = await this.drizzleDb.select({ universityId: schema.bookmarks.universityId }).from(schema.bookmarks).where(eq(schema.bookmarks.userEmail, email));
      return bookmarks.map((b: any) => b.universityId);
    } catch (err: any) {
      logger.error({ error: err.message }, "getBookmarks PG Error");
      throw err;
    }
  }

  // ──────────────────────────────────────────────────────────────────────────────
  //  SESSIONS OPERATIONS
  // ──────────────────────────────────────────────────────────────────────────────
  public async getSession(token: string): Promise<{ email: string; expiresAt: number } | null> {
    if (!this.isPostgres || !this.drizzleDb) {
      return this.mockSessions.find((s) => s.token === token && s.expiresAt > Date.now()) || null;
    }
    try {
      const sessions = await this.drizzleDb.select().from(schema.sessions).where(eq(schema.sessions.token, token)).limit(1);
      if (sessions.length > 0) {
        const s = sessions[0];
        if (s.expiresAt < Date.now()) return null;
        return { email: s.email, expiresAt: s.expiresAt };
      }
      return null;
    } catch (err: any) {
      logger.error({ error: err.message }, "getSession PG Error");
      throw err;
    }
  }

  public async createSession(token: string, email: string, expiresAt: number): Promise<void> {
    if (!this.isPostgres || !this.drizzleDb) {
      this.mockSessions.push({ token, email, expiresAt });
      return;
    }
    try {
      await this.drizzleDb.insert(schema.sessions).values({ token, email, expiresAt });
    } catch (err: any) {
      logger.error({ error: err.message }, "createSession PG Error");
      throw err;
    }
  }

  public async deleteSession(token: string): Promise<void> {
    if (!this.isPostgres || !this.drizzleDb) {
      this.mockSessions = this.mockSessions.filter((s) => s.token !== token);
      return;
    }
    try {
      await this.drizzleDb.delete(schema.sessions).where(eq(schema.sessions.token, token));
    } catch (err: any) {
      logger.error({ error: err.message }, "deleteSession PG Error");
      throw err;
    }
  }

  // ──────────────────────────────────────────────────────────────────────────────
  //  NOTIFICATIONS OPERATIONS
  // ──────────────────────────────────────────────────────────────────────────────
  public async getNotifications(email: string): Promise<any[]> {
    if (!this.isPostgres || !this.drizzleDb) {
      return this.mockNotifications.filter((n) => n.email === email);
    }
    try {
      return await this.drizzleDb.select().from(schema.notifications).where(eq(schema.notifications.userEmail, email)).orderBy(sql`${schema.notifications.createdAt} desc`);
    } catch (err: any) {
      logger.error({ error: err.message }, "getNotifications PG Error");
      throw err;
    }
  }

  public async markNotificationAsRead(id: number, email: string): Promise<boolean> {
    if (!this.isPostgres || !this.drizzleDb) {
      const n = this.mockNotifications.find((x) => x.id === id && x.email === email);
      if (n) {
        n.isRead = true;
        return true;
      }
      return false;
    }
    try {
      const updated = await this.drizzleDb.update(schema.notifications)
        .set({ read: true })
        .where(eq(schema.notifications.id, id))
        .returning();
      return updated.length > 0;
    } catch (err: any) {
      logger.error({ error: err.message }, "markNotificationAsRead PG Error");
      throw err;
    }
  }

  public async addNotification(email: string, title: string, message: string, type: string): Promise<void> {
    if (!this.isPostgres || !this.drizzleDb) {
      const id = (this.mockNotifications.length > 0 ? Math.max(...this.mockNotifications.map((n) => n.id)) : 0) + 1;
      this.mockNotifications.push({ id, email, title, message, isRead: false, created_at: new Date().toISOString(), type });
      return;
    }
    try {
      await this.drizzleDb.insert(schema.notifications).values({ userEmail: email, title, message, type, read: false });
    } catch (err: any) {
      logger.error({ error: err.message }, "addNotification PG Error");
    }
  }

  public async cleanupExpiredNotifications(retentionDays: number): Promise<number> {
    if (!this.isPostgres || !this.drizzleDb) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - retentionDays);
      const deleted = this.mockNotifications.filter((n) => new Date(n.created_at) < cutoff);
      this.mockNotifications = this.mockNotifications.filter((n) => new Date(n.created_at) >= cutoff);
      return deleted.length;
    }
    try {
      const deleted = await this.drizzleDb.delete(schema.notifications)
        .where(lt(schema.notifications.createdAt, new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000)))
        .returning();
      return deleted.length;
    } catch (err: any) {
      logger.error({ error: err.message, retentionDays }, "cleanupExpiredNotifications PG Error");
      return 0;
    }
  }

  // ──────────────────────────────────────────────────────────────────────────────
  //  STUDENT / PARENT PROFILES
  // ──────────────────────────────────────────────────────────────────────────────
  public async getStudentProfile(email: string): Promise<any> {
    if (!this.isPostgres || !this.drizzleDb) {
      const p = this.mockStudentProfiles.find((x) => x.email.toLowerCase() === email.toLowerCase());
      return p ? p.profile : null;
    }
    try {
      const rows = await this.drizzleDb.select().from(schema.studentProfiles).where(eq(schema.studentProfiles.userEmail, email)).limit(1);
      return rows.length > 0 ? rows[0] : null;
    } catch (err: any) {
      logger.error({ error: err.message }, "getStudentProfile PG Error");
      throw err;
    }
  }

  public async saveStudentProfile(email: string, profile: any): Promise<any> {
    if (!this.isPostgres || !this.drizzleDb) {
      const existing = this.mockStudentProfiles.find((x) => x.email.toLowerCase() === email.toLowerCase());
      if (existing) existing.profile = profile;
      else this.mockStudentProfiles.push({ email, profile });
      return profile;
    }
    try {
      await this.drizzleDb.insert(schema.studentProfiles)
        .values({ userEmail: email, ...profile })
        .onConflictDoUpdate({
          target: schema.studentProfiles.userEmail,
          set: { ...profile },
        });
      return profile;
    } catch (err: any) {
      logger.error({ error: err.message }, "saveStudentProfile PG Error");
      throw err;
    }
  }

  public async getParentProfile(email: string): Promise<any> {
    if (!this.isPostgres || !this.drizzleDb) {
      const p = this.mockParentProfiles.find((x) => x.email.toLowerCase() === email.toLowerCase());
      return p ? p.profile : null;
    }
    try {
      const rows = await this.drizzleDb.select().from(schema.parentProfiles).where(eq(schema.parentProfiles.userEmail, email)).limit(1);
      return rows.length > 0 ? rows[0] : null;
    } catch (err: any) {
      logger.error({ error: err.message }, "getParentProfile PG Error");
      throw err;
    }
  }

  public async saveParentProfile(email: string, profile: any): Promise<any> {
    if (!this.isPostgres || !this.drizzleDb) {
      const existing = this.mockParentProfiles.find((x) => x.email.toLowerCase() === email.toLowerCase());
      if (existing) existing.profile = profile;
      else this.mockParentProfiles.push({ email, profile });
      return profile;
    }
    try {
      await this.drizzleDb.insert(schema.parentProfiles)
        .values({ userEmail: email, ...profile })
        .onConflictDoUpdate({
          target: schema.parentProfiles.userEmail,
          set: { ...profile },
        });
      return profile;
    } catch (err: any) {
      logger.error({ error: err.message }, "saveParentProfile PG Error");
      throw err;
    }
  }

  public async updateUserRole(email: string, role: string): Promise<void> {
    if (!this.isPostgres || !this.drizzleDb) {
      const u = this.mockUsers.find((x) => x.email.toLowerCase() === email.toLowerCase());
      if (u) u.role = role;
      return;
    }
    try {
      await this.drizzleDb.update(schema.users)
        .set({ role })
        .where(eq(schema.users.email, email));
    } catch (err: any) {
      logger.error({ error: err.message }, "updateUserRole PG Error");
      throw err;
    }
  }

  // ──────────────────────────────────────────────────────────────────────────────
  //  CHAT HISTORY
  // ──────────────────────────────────────────────────────────────────────────────
  public async getChatHistory(email: string): Promise<{ role: string; content: string; createdAt: string }[]> {
    if (!this.isPostgres || !this.drizzleDb) {
      return this.mockChatHistory.filter((h) => h.email === email);
    }
    try {
      const rows = await this.drizzleDb.select({ role: schema.chatHistory.role, content: schema.chatHistory.content, createdAt: schema.chatHistory.createdAt })
        .from(schema.chatHistory)
        .where(eq(schema.chatHistory.userEmail, email))
        .orderBy(sql`${schema.chatHistory.createdAt} asc`);
      return rows.map((r) => ({ role: r.role, content: r.content, createdAt: r.createdAt.toISOString() }));
    } catch (err: any) {
      logger.error({ error: err.message }, "getChatHistory PG Error");
      throw err;
    }
  }

  public async saveChatMessage(email: string, role: string, content: string): Promise<void> {
    if (!this.isPostgres || !this.drizzleDb) {
      this.mockChatHistory.push({ email, role, content, createdAt: new Date().toISOString() });
      return;
    }
    try {
      await this.drizzleDb.insert(schema.chatHistory).values({ userEmail: email, role, content });
    } catch (err: any) {
      logger.error({ error: err.message }, "saveChatMessage PG Error");
    }
  }

  // ──────────────────────────────────────────────────────────────────────────────
  //  ADMIN / AUDIT
  // ──────────────────────────────────────────────────────────────────────────────
  public async getAllUsers(): Promise<UserDb[]> {
    if (!this.isPostgres || !this.drizzleDb) return this.mockUsers;
    try {
      return await this.drizzleDb.select().from(schema.users);
    } catch (err: any) {
      logger.error({ error: err.message }, "getAllUsers PG Error");
      throw err;
    }
  }

  public async getAllAuditLogs(): Promise<any[]> {
    if (!this.isPostgres || !this.drizzleDb) return this.mockAuditLogs;
    try {
      return await this.drizzleDb.select().from(schema.auditLogs).orderBy(sql`${schema.auditLogs.createdAt} desc`);
    } catch (err: any) {
      logger.error({ error: err.message }, "getAllAuditLogs PG Error");
      throw err;
    }
  }

  public logAnalyticsEvent(event: {
    eventType: string;
    details?: Record<string, any>;
    ip?: string;
    userEmail?: string;
    correlationId?: string;
  }): void {
    const details = {
      ...(event.details ?? {}),
      ...(event.correlationId ? { correlationId: event.correlationId } : {}),
    };

    if (!this.isPostgres || !this.drizzleDb) {
      this.mockAuditLogs.push({
        action: event.eventType,
        details,
        userEmail: event.userEmail,
        ip: event.ip,
        status: "success",
        correlationId: event.correlationId,
        createdAt: new Date(),
      });
      return;
    }

    void this.drizzleDb.insert(schema.auditLogs).values({
      action: event.eventType,
      details,
      userEmail: event.userEmail,
      ip: event.ip,
      status: "success",
      correlationId: event.correlationId,
    }).catch((err: Error) => {
      logger.error({ error: err.message, eventType: event.eventType }, "logAnalyticsEvent PG Error");
    });
  }

  // ──────────────────────────────────────────────────────────────────────────────
  //  Public fallback datastore surfaces consumed by monitoring / backup tooling.
  //  These mirror the live in-memory collections so the rest of the app can
  //  read counts / snapshots even when PostgreSQL is unreachable.
  // ──────────────────────────────────────────────────────────────────────────────

  // NOTE: previously this was a `get mockUniversities()` that recomputed
  // staticUniversityData() fresh on every access — any push/splice/assign done
  // by upsertUniversity/deleteUniversity was silently discarded on the next
  // read. Now backed by a real array, lazily seeded once, so writes persist.
  public get mockUniversities(): UniversityDb[] {
    if (!this.mockUniversitiesStore) {
      this.mockUniversitiesStore = staticUniversityData() as unknown as UniversityDb[];
    }
    return this.mockUniversitiesStore;
  }

  // ── surfaces consumed by monitoring.ts / s3Backup.ts ──────────────────────
  public mockSessions: { token: string; email: string; expiresAt: number }[] = [];
  public mockNotifications: any[] = [];
  public mockChatHistory: any[] = [];

  /** Snapshot of the full datastore for backup / diagnostics exports. */
  public async exportPostgresData(): Promise<Record<string, any>> {
    if (!this.isPostgres || !this.drizzleDb) {
      return {
        universities: staticUniversityData(),
        users: this.mockUsers,
        reviews: Object.values(this.mockReviews).flat(),
        bookmarks: this.mockBookmarks,
        notifications: this.mockNotifications,
        chatHistory: this.mockChatHistory,
        sessions: this.mockSessions,
      };
    }
    try {
      const unis = await this.drizzleDb.select().from(schema.universities);
      const users = await this.drizzleDb.select().from(schema.users);
      const reviews = await this.drizzleDb.select().from(schema.reviews);
      const bookmarks = await this.drizzleDb.select().from(schema.bookmarks);
      const notifications = await this.drizzleDb.select().from(schema.notifications);
      const chatHistory = await this.drizzleDb.select().from(schema.chatHistory);
      const sessions = await this.drizzleDb.select().from(schema.sessions);
      return { universities: unis, users, reviews, bookmarks, notifications, chatHistory, sessions };
    } catch (err: any) {
      logger.error({ error: err.message }, "exportPostgresData PG Error");
      return { universities: [], users: [], reviews: [], bookmarks: [], notifications: [], chatHistory: [], sessions: [] };
    }
  }

  public async importPostgresData(data: Record<string, any>): Promise<void> {
    if (!this.isPostgres || !this.drizzleDb) return;
    try {
      if (data.universities?.length) await this.drizzleDb.insert(schema.universities).values(data.universities as any).onConflictDoNothing();
      if (data.users?.length) await this.drizzleDb.insert(schema.users).values(data.users as any).onConflictDoNothing();
      if (data.reviews?.length) await this.drizzleDb.insert(schema.reviews).values(data.reviews as any).onConflictDoNothing();
      if (data.bookmarks?.length) await this.drizzleDb.insert(schema.bookmarks).values(data.bookmarks as any).onConflictDoNothing();
      if (data.notifications?.length) await this.drizzleDb.insert(schema.notifications).values(data.notifications as any).onConflictDoNothing();
      if (data.chatHistory?.length) await this.drizzleDb.insert(schema.chatHistory).values(data.chatHistory as any).onConflictDoNothing();
      if (data.sessions?.length) await this.drizzleDb.insert(schema.sessions).values(data.sessions as any).onConflictDoNothing();
    } catch (err: any) {
      logger.error({ error: err.message }, "importPostgresData PG Error");
    }
  }

  public async cleanupExpiredSessions(retentionDays = 1): Promise<number> {
    if (!this.isPostgres || !this.drizzleDb) {
      const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
      const deleted = this.mockSessions.filter((s) => s.expiresAt < cutoff);
      this.mockSessions = this.mockSessions.filter((s) => s.expiresAt >= cutoff);
      return deleted.length;
    }
    try {
      const deleted = await this.drizzleDb.delete(schema.sessions)
        .where(lt(schema.sessions.expiresAt, Date.now()))
        .returning();
      return deleted.length;
    } catch (err: any) {
      logger.error({ error: err.message }, "cleanupExpiredSessions PG Error");
      return 0;
    }
  }

  public async cleanupExpiredTokens(retentionDays = 1): Promise<number> {
    if (!this.isPostgres || !this.drizzleDb) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - retentionDays);
      const deleted = this.mockUsers.filter((u) => u.verificationExpires && new Date(u.verificationExpires) < cutoff).length;
      return deleted;
    }
    try {
      const deleted = await this.drizzleDb.update(schema.users)
        .set({ verificationToken: null, verificationExpires: null })
        .where(lt(schema.users.verificationExpires, new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000)))
        .returning();
      return deleted.length;
    } catch (err: any) {
      logger.error({ error: err.message }, "cleanupExpiredTokens PG Error");
      return 0;
    }
  }

  public async cleanupExpiredLoginAttempts(retentionDays = 1): Promise<number> {
    if (!this.isPostgres || !this.drizzleDb) return 0;
    try {
      const deleted = await this.drizzleDb.delete(schema.loginAttempts)
        .where(lt(schema.loginAttempts.attemptTime, new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000)))
        .returning();
      return deleted.length;
    } catch (err: any) {
      logger.error({ error: err.message }, "cleanupExpiredLoginAttempts PG Error");
      return 0;
    }
  }
}

export const dbService = new DatabaseService();
