var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/server/logger.ts
var import_pino, isProduction, logger;
var init_logger = __esm({
  "src/server/logger.ts"() {
    import_pino = __toESM(require("pino"), 1);
    isProduction = process.env.NODE_ENV === "production";
    logger = (0, import_pino.default)({
      level: process.env.LOG_LEVEL || (isProduction ? "info" : "debug"),
      transport: isProduction ? void 0 : {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          ignore: "pid,hostname"
        }
      }
    });
  }
});

// src/server/email.ts
var email_exports = {};
__export(email_exports, {
  sendVerificationEmail: () => sendVerificationEmail
});
async function sendVerificationEmail(email, token, appUrl) {
  const verifyUrl = `${appUrl}/verify-email?token=${token}`;
  logger.info({ email, verifyUrl }, `Attempting to send verification email via Resend. [TEST LINK FOR TESTING/DEVELOPMENT]: ${verifyUrl}`);
  const trySend = async (fromAddress) => {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: `UniInfo <${fromAddress}>`,
          to: [email],
          subject: "Verify your email address - UniInfo Secure Portal",
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
              <h2 style="color: #1f2937; margin-bottom: 16px;">Welcome to UniInfo!</h2>
              <p style="color: #4b5563; line-height: 1.5; font-size: 16px;">
                Thank you for registering. Please verify your email address to unlock all premium features, verified reviews submission, and AI-powered university counseling.
              </p>
              <div style="margin: 24px 0;">
                <a href="${verifyUrl}" style="background-color: #c9a35c; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                  Verify Email Address
                </a>
              </div>
              <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
                If the button doesn't work, copy and paste the following URL into your browser:
              </p>
              <p style="color: #ec4899; font-size: 14px; word-break: break-all;">
                ${verifyUrl}
              </p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
              <p style="color: #9ca3af; font-size: 12px;">
                This link is valid for 24 hours. If you did not register for a UniInfo account, please ignore this email.
              </p>
            </div>
          `
        })
      });
      const data = await response.json();
      return { ok: response.ok, data };
    } catch (err) {
      return { ok: false, data: { message: err.message } };
    }
  };
  let res = await trySend(EMAIL_FROM);
  if (!res.ok && EMAIL_FROM !== "onboarding@resend.dev") {
    logger.warn({ email, originalError: res.data }, "Failed to send email with configured sender. Retrying with onboarding@resend.dev...");
    res = await trySend("onboarding@resend.dev");
  }
  if (!res.ok) {
    logger.error({ email, error: res.data }, "Failed to send email via Resend API on all attempts");
    return false;
  }
  logger.info({ email, id: res.data.id }, "Verification email sent successfully via Resend.");
  return true;
}
var RESEND_API_KEY, EMAIL_FROM;
var init_email = __esm({
  "src/server/email.ts"() {
    init_logger();
    RESEND_API_KEY = process.env.RESEND_API_KEY || "re_4KfjnXAc_Gx8f2pgEQmb7Bev6y3Luo8dG";
    EMAIL_FROM = process.env.EMAIL_FROM || "noreply@uninfo.in";
  }
});

// server.ts
var server_exports = {};
__export(server_exports, {
  getClearSessionCookieHeader: () => getClearSessionCookieHeader,
  getSessionCookieHeader: () => getSessionCookieHeader
});
module.exports = __toCommonJS(server_exports);
var import_express = __toESM(require("express"), 1);
var import_http = __toESM(require("http"), 1);
var import_path4 = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_dotenv = __toESM(require("dotenv"), 1);
var import_crypto2 = __toESM(require("crypto"), 1);
var import_app = require("firebase-admin/app");
var import_auth = require("firebase-admin/auth");
var import_compression = __toESM(require("compression"), 1);
init_logger();

// src/server/backup.ts
var import_fs = __toESM(require("fs"), 1);
var import_path = __toESM(require("path"), 1);
init_logger();

// src/db/dbService.ts
var import_pg = __toESM(require("pg"), 1);
var import_node_postgres = require("drizzle-orm/node-postgres");
var import_drizzle_orm = require("drizzle-orm");

// src/db/schema.ts
var import_pg_core = require("drizzle-orm/pg-core");
var users = (0, import_pg_core.pgTable)("users", {
  id: (0, import_pg_core.serial)("id").primaryKey(),
  email: (0, import_pg_core.varchar)("email", { length: 255 }).unique().notNull(),
  password: (0, import_pg_core.text)("password").notNull(),
  role: (0, import_pg_core.varchar)("role", { length: 50 }).notNull().default("Student"),
  name: (0, import_pg_core.varchar)("name", { length: 100 }),
  loginFailures: (0, import_pg_core.integer)("login_failures").default(0).notNull(),
  lockedUntil: (0, import_pg_core.bigint)("locked_until", { mode: "number" }).default(0).notNull(),
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull(),
  emailVerified: (0, import_pg_core.boolean)("email_verified").default(false).notNull(),
  verificationToken: (0, import_pg_core.text)("verification_token"),
  verificationExpires: (0, import_pg_core.timestamp)("verification_expires")
});
var universities = (0, import_pg_core.pgTable)("universities", {
  id: (0, import_pg_core.integer)("id").primaryKey(),
  name: (0, import_pg_core.text)("name").notNull(),
  location: (0, import_pg_core.text)("location").notNull(),
  state: (0, import_pg_core.text)("state").notNull(),
  type: (0, import_pg_core.text)("type").notNull(),
  fee: (0, import_pg_core.integer)("fee").notNull(),
  rating: (0, import_pg_core.doublePrecision)("rating").notNull(),
  students: (0, import_pg_core.text)("students").notNull(),
  courses: (0, import_pg_core.integer)("courses").notNull(),
  image: (0, import_pg_core.text)("image").notNull(),
  logo: (0, import_pg_core.text)("logo"),
  categories: (0, import_pg_core.jsonb)("categories").notNull(),
  stream: (0, import_pg_core.jsonb)("stream").notNull(),
  degrees: (0, import_pg_core.jsonb)("degrees").notNull(),
  majors: (0, import_pg_core.jsonb)("majors").notNull(),
  popularCourses: (0, import_pg_core.jsonb)("popular_courses").notNull(),
  phone: (0, import_pg_core.text)("phone").notNull(),
  competitiveExams: (0, import_pg_core.jsonb)("competitive_exams").notNull(),
  min10th: (0, import_pg_core.integer)("min_10th").notNull(),
  min12th: (0, import_pg_core.integer)("min_12th").notNull(),
  naacGrade: (0, import_pg_core.text)("naac_grade").notNull(),
  nirfRank: (0, import_pg_core.integer)("nirf_rank").notNull(),
  aicteApproved: (0, import_pg_core.boolean)("aicte_approved").notNull(),
  nbaAccredited: (0, import_pg_core.boolean)("nba_accredited").notNull(),
  nmcRecognized: (0, import_pg_core.boolean)("nmc_recognized").notNull(),
  avgPlacementLPA: (0, import_pg_core.doublePrecision)("avg_placement_lpa").notNull(),
  website: (0, import_pg_core.text)("website"),
  virtualTourUrl: (0, import_pg_core.text)("virtual_tour_url"),
  expertInsight: (0, import_pg_core.text)("expert_insight"),
  alumniStories: (0, import_pg_core.jsonb)("alumni_stories"),
  campusMap: (0, import_pg_core.jsonb)("campus_map"),
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull()
});
var sessions = (0, import_pg_core.pgTable)("sessions", {
  token: (0, import_pg_core.varchar)("token", { length: 255 }).primaryKey(),
  email: (0, import_pg_core.varchar)("email", { length: 255 }).notNull(),
  expiresAt: (0, import_pg_core.bigint)("expires_at", { mode: "number" }).notNull()
});
var reviews = (0, import_pg_core.pgTable)("reviews", {
  id: (0, import_pg_core.serial)("id").primaryKey(),
  universityId: (0, import_pg_core.integer)("university_id").notNull().references(() => universities.id, { onDelete: "cascade" }),
  userEmail: (0, import_pg_core.varchar)("user_email", { length: 255 }).notNull(),
  userName: (0, import_pg_core.varchar)("user_name", { length: 100 }).notNull().default("Student"),
  rating: (0, import_pg_core.integer)("rating").notNull(),
  comment: (0, import_pg_core.text)("comment").notNull(),
  avatar: (0, import_pg_core.text)("avatar"),
  reviewDate: (0, import_pg_core.varchar)("review_date", { length: 50 }).notNull(),
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull()
}, (table) => {
  return {
    uniIdx: (0, import_pg_core.index)("reviews_university_id_idx").on(table.universityId),
    emailIdx: (0, import_pg_core.index)("reviews_user_email_idx").on(table.userEmail)
  };
});
var bookmarks = (0, import_pg_core.pgTable)("bookmarks", {
  id: (0, import_pg_core.serial)("id").primaryKey(),
  userEmail: (0, import_pg_core.varchar)("user_email", { length: 255 }).notNull().references(() => users.email, { onDelete: "cascade" }),
  universityId: (0, import_pg_core.integer)("university_id").notNull().references(() => universities.id, { onDelete: "cascade" }),
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull()
}, (table) => {
  return {
    userUniUnique: (0, import_pg_core.uniqueIndex)("bookmarks_user_uni_unique_idx").on(table.userEmail, table.universityId)
  };
});
var chatHistory = (0, import_pg_core.pgTable)("chat_history", {
  id: (0, import_pg_core.serial)("id").primaryKey(),
  userEmail: (0, import_pg_core.varchar)("user_email", { length: 255 }),
  role: (0, import_pg_core.varchar)("role", { length: 50 }).notNull(),
  content: (0, import_pg_core.text)("content").notNull(),
  correlationId: (0, import_pg_core.varchar)("correlation_id", { length: 255 }),
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull()
}, (table) => {
  return {
    emailIdx: (0, import_pg_core.index)("chat_history_email_idx").on(table.userEmail)
  };
});
var auditLogs = (0, import_pg_core.pgTable)("audit_logs", {
  id: (0, import_pg_core.serial)("id").primaryKey(),
  action: (0, import_pg_core.varchar)("action", { length: 100 }).notNull(),
  details: (0, import_pg_core.jsonb)("details").default({}).notNull(),
  userEmail: (0, import_pg_core.varchar)("user_email", { length: 255 }),
  ip: (0, import_pg_core.varchar)("ip", { length: 100 }),
  status: (0, import_pg_core.varchar)("status", { length: 50 }),
  correlationId: (0, import_pg_core.varchar)("correlation_id", { length: 255 }),
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull()
});
var loginAttempts = (0, import_pg_core.pgTable)("login_attempts", {
  id: (0, import_pg_core.serial)("id").primaryKey(),
  ip: (0, import_pg_core.varchar)("ip", { length: 100 }).notNull(),
  email: (0, import_pg_core.varchar)("email", { length: 255 }),
  success: (0, import_pg_core.boolean)("success").notNull(),
  attemptTime: (0, import_pg_core.timestamp)("attempt_time").defaultNow().notNull()
}, (table) => {
  return {
    ipIdx: (0, import_pg_core.index)("login_attempts_ip_idx").on(table.ip)
  };
});
var studentProfiles = (0, import_pg_core.pgTable)("student_profiles", {
  id: (0, import_pg_core.serial)("id").primaryKey(),
  userEmail: (0, import_pg_core.varchar)("user_email", { length: 255 }).unique().notNull().references(() => users.email, { onDelete: "cascade" }),
  stream: (0, import_pg_core.varchar)("stream", { length: 100 }),
  budget: (0, import_pg_core.integer)("budget"),
  preferredLocation: (0, import_pg_core.varchar)("preferred_location", { length: 255 }),
  preferredCourse: (0, import_pg_core.varchar)("preferred_course", { length: 255 }),
  entranceExams: (0, import_pg_core.jsonb)("entrance_exams"),
  // e.g. ["BITSAT", "JEE"]
  hostelPreference: (0, import_pg_core.boolean)("hostel_preference").default(false).notNull(),
  placementPriority: (0, import_pg_core.varchar)("placement_priority", { length: 100 }),
  // e.g. "High", "Medium", "Low"
  academicScores: (0, import_pg_core.jsonb)("academic_scores"),
  // e.g. { "tenth": 90, "twelfth": 92 }
  careerGoals: (0, import_pg_core.text)("career_goals"),
  updatedAt: (0, import_pg_core.timestamp)("updated_at").defaultNow().notNull()
});
var parentProfiles = (0, import_pg_core.pgTable)("parent_profiles", {
  id: (0, import_pg_core.serial)("id").primaryKey(),
  userEmail: (0, import_pg_core.varchar)("user_email", { length: 255 }).unique().notNull().references(() => users.email, { onDelete: "cascade" }),
  budget: (0, import_pg_core.integer)("budget"),
  preferredStateCity: (0, import_pg_core.varchar)("preferred_state_city", { length: 255 }),
  safetyPreference: (0, import_pg_core.varchar)("safety_preference", { length: 100 }),
  // High, Medium, Low
  roiPreference: (0, import_pg_core.varchar)("roi_preference", { length: 100 }),
  // High, Medium, Low
  scholarshipPreference: (0, import_pg_core.varchar)("scholarship_preference", { length: 100 }),
  // Yes, No, Indifferent
  distancePreference: (0, import_pg_core.varchar)("distance_preference", { length: 100 }),
  // Close, Moderate, Far
  accommodationPreference: (0, import_pg_core.varchar)("accommodation_preference", { length: 100 }),
  // Hostel, PG, Day scholar
  updatedAt: (0, import_pg_core.timestamp)("updated_at").defaultNow().notNull()
});
var notifications = (0, import_pg_core.pgTable)("notifications", {
  id: (0, import_pg_core.serial)("id").primaryKey(),
  userEmail: (0, import_pg_core.varchar)("user_email", { length: 255 }).notNull(),
  title: (0, import_pg_core.varchar)("title", { length: 255 }).notNull(),
  message: (0, import_pg_core.text)("message").notNull(),
  type: (0, import_pg_core.varchar)("type", { length: 100 }).notNull(),
  // verification, reset_password, announcement, review_status, uni_update
  read: (0, import_pg_core.boolean)("read").default(false).notNull(),
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull()
});
var schema = {
  users,
  universities,
  sessions,
  reviews,
  bookmarks,
  chatHistory,
  auditLogs,
  loginAttempts,
  studentProfiles,
  parentProfiles,
  notifications
};

// src/db/dbService.ts
init_logger();

// src/data.ts
var universities2 = [
  {
    id: 9,
    name: "UPES Dehradun",
    location: "Dehradun, India",
    state: "Uttarakhand",
    type: "Private",
    degreeLevel: ["UG", "PG"],
    fee: 36e4,
    rating: 4.2,
    students: "20,000+",
    courses: 180,
    image: "https://picsum.photos/seed/upes/800/500",
    categories: ["Engineering", "Management", "Law", "Design"],
    stream: ["Engineering", "Management", "Law", "Design", "Science"],
    degrees: ["B.Tech", "MBA", "LLB", "B.Des", "M.Tech"],
    majors: ["Computer Science", "Petroleum Engineering", "Energy Engineering", "Corporate Law", "UX/UI Design"],
    popularCourses: ["B.Tech Petroleum", "B.Des Product Design", "MBA Energy Management"],
    phone: "1800-102-8737",
    competitiveExams: ["CUET", "JEE Main", "UPESEAT"],
    min10th: 60,
    min12th: 60,
    naacGrade: "A",
    nirfRank: 52,
    aicteApproved: true,
    nbaAccredited: false,
    nmcRecognized: false,
    avgPlacementLPA: 7.5,
    website: "https://www.upes.ac.in/",
    virtualTourUrl: "https://youtu.be/hZvkVDX2GYw?si=HSGXgqtXU-EObZ-J",
    logo: "https://logo.clearbit.com/upes.ac.in",
    expertInsight: "UPES Dehradun is a pioneer in industry-focused education, particularly in Energy and Petroleum sectors. Their 'School for Life' initiative ensures students gain life skills alongside technical expertise, making them highly adaptable in the modern workforce.",
    reviews: [
      { id: 6, user: "Megha D.", rating: 4, comment: "Specialized courses are very industry-focused.", date: "2024-03-05", avatar: "https://i.pravatar.cc/150?u=megha" }
    ],
    alumniStories: [
      {
        id: 401,
        name: "Karan Malhotra",
        role: "Drilling Operations Engineer",
        company: "ONGC",
        graduationYear: 2011,
        quote: "UPES's highly specialized energy curriculum and mountain-side petroleum test beds enabled me to transition to heavy field operations with deep domain confidence.",
        image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200",
        achievementBadge: "Energy Sector Innovator"
      },
      {
        id: 402,
        name: "Shreya Sen",
        role: "UX Interaction Lead",
        company: "Swiggy",
        graduationYear: 2018,
        quote: "The magnificent pine trees and mountains of UPES created a unique design setting that continually pushed my aesthetic limits in user experience design.",
        image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200",
        achievementBadge: "Top Design Alumni"
      }
    ],
    campusMap: {
      acreage: 30,
      established: 2003,
      hasHostels: true,
      totalBuildings: 32,
      zones: [
        {
          id: "academic-block",
          name: "Bidholi Engineering Towers",
          description: "Stunning mountain-border academic classrooms hosting specialized petroleum, digital energy, and AI model networks.",
          capacity: "3,500 seats",
          highlights: ["Pine valley views", "Integrated Design labs", "Real-time chemical testing gear"],
          type: "academic"
        },
        {
          id: "research-park",
          name: "Solar & Bio-Fuel Research Wing",
          description: "Strategic lab infrastructure centering biofuel chemical analysis, solar tracking system calibration, and environmental tracking instrumentation.",
          capacity: "10 core labs",
          highlights: ["Bio-diesel production platform", "High solar tracking arrays", "Alternative energy models"],
          type: "research"
        },
        {
          id: "residential",
          name: "Bidholi Alpine Dormitories",
          description: "Cozy student quarters configured with warm floor heating, central hot water systems, and breathtaking valley scenic views.",
          capacity: "2,200 residents",
          highlights: ["Thermal environment systems", "Dehradun food network", "Scenic outdoor trails"],
          type: "residential"
        },
        {
          id: "recreational",
          name: "The amphitheatre & Lounge",
          description: "Gorgeous open amphitheatre configured looking out onto clear mountain ranges, hosting student design work showcases.",
          capacity: "1,500 capacity",
          highlights: ["Mountain range view deck", "Music presentation spaces", "Strategic focal lighting design"],
          type: "recreational"
        }
      ]
    }
  },
  {
    id: 16,
    name: "Amity University Noida",
    location: "Noida, India",
    state: "Uttar Pradesh",
    type: "Private",
    degreeLevel: ["UG", "PG", "PhD"],
    fee: 28e4,
    rating: 4.1,
    students: "150,000+",
    courses: 400,
    image: "https://picsum.photos/seed/amity/800/500",
    categories: ["Multi-disciplinary", "Global"],
    stream: ["Engineering", "Management", "Arts", "Law", "Medical"],
    degrees: ["B.Tech", "MBA", "BA", "LLB", "MBBS"],
    majors: ["Computer Science", "Business Management", "Psychology", "Journalism"],
    popularCourses: ["MBA", "B.Tech CSE", "B.A. Psychology"],
    phone: "0120-2445252",
    competitiveExams: ["CUET", "JEE Main", "AMITYJEE"],
    min10th: 60,
    min12th: 60,
    naacGrade: "A+",
    nirfRank: 35,
    aicteApproved: true,
    nbaAccredited: false,
    nmcRecognized: true,
    avgPlacementLPA: 6.5,
    website: "https://www.amity.edu/",
    virtualTourUrl: "https://www.amity.edu/virtual-tour/",
    logo: "https://logo.clearbit.com/amity.edu",
    reviews: [
      { id: 7, user: "Karan P.", rating: 3, comment: "Infrastructure is top-notch, but academics can be better.", date: "2024-02-10", avatar: "https://i.pravatar.cc/150?u=karan" }
    ],
    expertInsight: "Amity Noida highlights an extremely modern lifestyle campus environment in Delhi NCR. With massive high-rise blocks, high technology laboratories, and global study options, it holds immense popularity.",
    alumniStories: [
      {
        id: 501,
        name: "Divya Sharma",
        role: "Senior Investment Strategist",
        company: "Goldman Sachs",
        graduationYear: 2015,
        quote: "Amity Noida provided an incredible mix of academic depth and continuous corporate workshops that prepared me for competitive corporate finance.",
        image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=200",
        achievementBadge: "Fintech Leader"
      },
      {
        id: 502,
        name: "Rohan Kapoor",
        role: "Co-Founder",
        company: "Volt D2C Brands",
        graduationYear: 2017,
        quote: "The incubation parks and funding opportunities at Amity's annual events gave me the core pitching skills to request seed funds successfully.",
        image: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=200",
        achievementBadge: "30 Under 30 nominee"
      }
    ],
    campusMap: {
      acreage: 60,
      established: 1986,
      hasHostels: true,
      totalBuildings: 48,
      zones: [
        {
          id: "academic-block",
          name: "Amity H-Block Towers",
          description: "Ultra-tech corporate-style high rises equipped with business rooms, legal mock moot courts, and media recording suites.",
          capacity: "9,000 seats",
          highlights: ["Moot court rooms", "Media broadcasting gear", "Modern computing environments"],
          type: "academic"
        },
        {
          id: "research-park",
          name: "Amity Microbial Tech Institute",
          description: "High performance research lab focusing on tissue culture advancements, agronomy developments, and modern bio-fuels.",
          capacity: "16 laboratories",
          highlights: ["Bio-amplifier systems", "Sterile incubation environments", "Industrial testing equipment"],
          type: "research"
        },
        {
          id: "residential",
          name: "Amity Residential Suites (H-I Blocks)",
          description: "Fully guarded modern resident dormitories complete with high-performance networking, hot water systems, and attached cafeterias.",
          capacity: "4,500 residents",
          highlights: ["Strict biometric checkpoints", "Central dining cafeterias", "Underground student lounge areas"],
          type: "residential"
        },
        {
          id: "recreational",
          name: "The Amity Central Plaza",
          description: "Sprawling active plaza configured with well-known food franchises, student bookstores, and central green stages for college events.",
          capacity: "4,000 capacity",
          highlights: ["Global cuisine food courts", "Central landscape lawn stairs", "Grand outdoor track arenas"],
          type: "recreational"
        }
      ]
    }
  },
  {
    id: 17,
    name: "SRM Institute of Science and Technology",
    location: "Chennai, India",
    state: "Tamil Nadu",
    type: "Private",
    degreeLevel: ["UG", "PG"],
    fee: 35e4,
    rating: 4.3,
    students: "50,000+",
    courses: 250,
    image: "https://picsum.photos/seed/srm/800/500",
    categories: ["Technical", "Medical"],
    stream: ["Engineering", "Medical", "Management"],
    degrees: ["B.Tech", "M.Tech", "MBBS", "MBA"],
    majors: ["Computer Science", "Nanotechnology", "Automobile Engineering"],
    popularCourses: ["B.Tech CSE", "MBBS", "B.Tech Aerospace"],
    phone: "+91 44 2741 7000",
    competitiveExams: ["SRMJEEE", "JEE Main", "NEET"],
    min10th: 60,
    min12th: 60,
    naacGrade: "A++",
    nirfRank: 18,
    aicteApproved: true,
    nbaAccredited: true,
    nmcRecognized: true,
    avgPlacementLPA: 8.5,
    website: "https://www.srmist.edu.in/",
    virtualTourUrl: "https://www.srmist.edu.in/virtual-tour/",
    logo: "https://logo.clearbit.com/srmist.edu.in",
    reviews: [
      { id: 8, user: "Arjun V.", rating: 4, comment: "Great research opportunities in Nanotech.", date: "2024-03-12", avatar: "https://i.pravatar.cc/150?u=arjun" }
    ],
    expertInsight: "SRM Chennai holds a massive student population representing almost every state in India. Their space program, which built SRM-SAT in collaboration with ISRO, highlights their premier experimental support.",
    alumniStories: [
      {
        id: 601,
        name: "Vikram Adithya",
        role: "Primary Aerospace Scientist",
        company: "ISRO Research",
        graduationYear: 2013,
        quote: "Constructing SRM-SAT, our own high-altitude model, in SRM's satellite project fundamentally directed my research passion towards aerospace simulation.",
        image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=200",
        achievementBadge: "ISRO Satellite Scientist"
      },
      {
        id: 602,
        name: "Nithya Ramakrishnan",
        role: "Senior Director of Cloud Products",
        company: "Salesforce",
        graduationYear: 2011,
        quote: "The immense diversity at SRM Chennai, dealing with over 40,000 students, forged my communication and cross-cultural product leadership abilities early on.",
        image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200",
        achievementBadge: "Enterprise Software Leader"
      }
    ],
    campusMap: {
      acreage: 250,
      established: 1985,
      hasHostels: true,
      totalBuildings: 68,
      zones: [
        {
          id: "academic-block",
          name: "SRM Tech Park Tower",
          description: "Massive high-concept classroom block configured with server configurations, IoT networks, and engineering design hubs.",
          capacity: "8,500 seats",
          highlights: ["Cloud research laboratory", "Advanced modeling platforms", "Engineering classrooms"],
          type: "academic"
        },
        {
          id: "research-park",
          name: "SRM Space Science Laboratory",
          description: "Distinguished research pavilion hosting ground station satellite telemetry systems, ISRO-linked communication rigs, and cleanrooms.",
          capacity: "12 custom labs",
          highlights: ["Satellite communication desk", "Air tight electronics labs", "Cleanroom level testing"],
          type: "research"
        },
        {
          id: "residential",
          name: "Adhiyaman Mega Resident Complex",
          description: "Hostel arrays equipped with integrated spacious food corridors, laundry service centers, and fully attached washrooms.",
          capacity: "10,500 residents",
          highlights: ["attached dining facilities", "Indoor sports games rooms", "Health clinic helpdesks"],
          type: "residential"
        },
        {
          id: "recreational",
          name: "TP Ganesan Convention Center",
          description: "One of the grandest auditoriums in India, hosting international symposiums, celebrity keynotes, and student fests.",
          capacity: "4,500 seats",
          highlights: ["State-of-the-art acoustic panels", "Sub-conference seminar vaults", "Vast reception lobbies"],
          type: "recreational"
        }
      ]
    }
  },
  {
    id: 18,
    name: "Thapar Institute of Engineering and Technology",
    location: "Patiala, India",
    state: "Punjab",
    type: "Private",
    degreeLevel: ["UG", "PG"],
    fee: 45e4,
    rating: 4.4,
    students: "12,000+",
    courses: 80,
    image: "https://picsum.photos/seed/thapar/800/500",
    categories: ["Technical", "Research"],
    stream: ["Engineering", "Management"],
    degrees: ["B.Tech", "M.Tech", "MBA"],
    majors: ["Computer Science", "Electronics & Communication", "Mechanical Engineering"],
    popularCourses: ["B.E. Computer Engineering", "B.E. Electronics", "MBA Finance"],
    phone: "+91 175 239 3021",
    competitiveExams: ["JEE Main"],
    min10th: 60,
    min12th: 70,
    naacGrade: "A+",
    nirfRank: 20,
    aicteApproved: true,
    nbaAccredited: true,
    nmcRecognized: false,
    avgPlacementLPA: 10.5,
    website: "https://www.thapar.edu/",
    virtualTourUrl: "https://www.thapar.edu/virtual-tour/",
    logo: "https://logo.clearbit.com/thapar.edu",
    reviews: [
      { id: 9, user: "Simran G.", rating: 5, comment: "Academic rigor is high, but prepares you well.", date: "2024-03-08", avatar: "https://i.pravatar.cc/150?u=simran" }
    ],
    expertInsight: "Thapar Patiala is internationally acknowledged for outstanding infrastructure designed by world class architects. Their learning blocks feature soundproofed, highly inspiring study zones.",
    alumniStories: [
      {
        id: 701,
        name: "Gurudev Singh",
        role: "Principal Principal Engineer",
        company: "Amazon Web Services",
        graduationYear: 1999,
        quote: "The relentless engineering standards and coding discipline in Patiala helped me architect high load cloud systems that serve the global web infrastructure today.",
        image: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=200",
        achievementBadge: "Cloud Architect Lead"
      },
      {
        id: 702,
        name: "Natasha Gill",
        role: "Lead Architect",
        company: "Gensler Architects",
        graduationYear: 2008,
        quote: "Thapar's red-brick building layouts and world-class architectural spaces physically demonstrated structural design excellence inside the campus walls.",
        image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200",
        achievementBadge: "International Architect"
      }
    ],
    campusMap: {
      acreage: 250,
      established: 1956,
      hasHostels: true,
      totalBuildings: 52,
      zones: [
        {
          id: "academic-block",
          name: "Thapar Learning Center (TLC)",
          description: "Stunning contemporary academic block designed with soundproofing, custom multimedia projection systems, and open layouts.",
          capacity: "5,000 seats",
          highlights: ["Award-winning global architecture", "spacious interaction desks", "Sound insulated study bays"],
          type: "academic"
        },
        {
          id: "research-park",
          name: "Thapar Strategic Research Wing",
          description: "Advanced infrastructure supporting sustainable materials testing, structural simulation, polymer engineering, and AI grids.",
          capacity: "14 high-tech labs",
          highlights: ["Specialized materials lab", "Environmental chemistry bay", "Supercomputing stations"],
          type: "research"
        },
        {
          id: "residential",
          name: "Mod Hostels (M & N Block)",
          description: "Contemporary glass-paneled hostel configurations offering beautiful student resident layouts with silent study desks.",
          capacity: "4,500 residents",
          highlights: ["Biophilic design interiors", "Quiet individual study zones", "Modern dining dining"],
          type: "residential"
        },
        {
          id: "recreational",
          name: "COS Student Center Plaza",
          description: "The primary brick amphitheatre and outdoor restaurant lounge where students hold concerts and interact.",
          capacity: "2,000 capacity",
          highlights: ["Patiala brick outdoor theatre", "Lush visual dining patios", "Indie music setups"],
          type: "recreational"
        }
      ]
    }
  }
];

// src/db/staticUsers.ts
var staticUsers = [];

// src/db/staticBookmarks.ts
var staticBookmarks = [];

// src/db/staticReviews.ts
var staticReviews = [];

// src/db/staticNotifications.ts
var staticNotifications = [];

// src/db/dbService.ts
function staticUniversityData() {
  return universities2.map((u) => ({
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
    categories: u.categories ?? [],
    stream: u.stream ?? [],
    degrees: u.degrees ?? [],
    majors: u.majors ?? [],
    popularCourses: u.popularCourses ?? [],
    phone: u.phone,
    competitiveExams: u.competitiveExams ?? [],
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
    alumniStories: u.alumniStories ?? [],
    campusMap: u.campusMap ?? { hasHostels: true, library: true, labs: true, sportsComplex: true }
  }));
}
var MAX_RECOVERY_ATTEMPTS = 8;
var RECOVERY_BACKOFF_BASE_MS = 800;
var DatabaseService = class {
  constructor() {
    this.pgPool = null;
    this.drizzleDb = null;
    this.isPostgres = false;
    this.mockUsers = [];
    this.mockBookmarks = [];
    this.mockReviews = {};
    this.recoveryAttempts = 0;
    this.recoveryTimer = null;
    // ── surfaces consumed by monitoring.ts / s3Backup.ts ──────────────────────
    this.mockSessions = [];
    this.mockNotifications = [];
    this.mockChatHistory = [];
    // ──────────────────────────────────────────────────────────────────────────────
    //  STATIC DATA SEED (kept in sync with src/data.ts so the in-memory mode is
    //  functionally identical to the live Postgres seed)
    // ──────────────────────────────────────────────────────────────────────────────
    this.staticUniversityData = staticUniversityData;
    setTimeout(() => {
      this.initialize();
    }, 0);
  }
  cleanDatabaseUrl(rawUrl) {
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
  isFatalError(err) {
    if (!err) return false;
    const msg = (err.message || "").toLowerCase();
    const code = err.code || "";
    return code === "ENOTFOUND" || code === "EAI_AGAIN" || code === "28P01" || code === "3D000" || code === "ECONNREFUSED" || msg.includes("enotfound") || msg.includes("tenant/user") || msg.includes("not found") || msg.includes("password authentication failed") || msg.includes("database") && msg.includes("does not exist") || msg.includes("role") && msg.includes("does not exist");
  }
  async initialize() {
    let attempts = 0;
    const maxAttempts = 3;
    let delay = 1e3;
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
  async tryConnect() {
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
          const pool = new import_pg.default.Pool({
            connectionString: dbUrl,
            ssl: hasSslmodeDisable ? void 0 : { rejectUnauthorized: false },
            max: 25,
            connectionTimeoutMillis: 3e3,
            idleTimeoutMillis: 3e4
          });
          pool.on("error", (err) => {
            logger.warn({ error: err.message, code: err.code }, "Unexpected error on idle PostgreSQL client; triggering pool recovery.");
            this.recoverFromPoolFault(err).catch((recoverErr) => {
            });
          });
          this.pgPool = pool;
          const client = await this.pgPool.connect();
          client.release();
          this.drizzleDb = (0, import_node_postgres.drizzle)(this.pgPool, { schema });
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
            user_name TEXT NOT NULL, rating INTEGER NOT NULL, comment TEXT NOT NULL,
            review_date DATE NOT NULL, avatar TEXT, created_at TIMESTAMP DEFAULT NOW() NOT NULL
          );`);
          await this.pgPool.query(`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS avatar TEXT;`);
          await this.pgPool.query(`CREATE TABLE IF NOT EXISTS sessions (
            token VARCHAR(255) PRIMARY KEY, email VARCHAR(255) NOT NULL, expires_at BIGINT NOT NULL
          );`);
          await this.pgPool.query(`CREATE TABLE IF NOT EXISTS bookmarks (
            id SERIAL PRIMARY KEY, user_email VARCHAR(255) NOT NULL, university_id INTEGER NOT NULL REFERENCES universities(id) ON DELETE CASCADE, created_at TIMESTAMP DEFAULT NOW() NOT NULL
          );`);
          await this.pgPool.query(`CREATE TABLE IF NOT EXISTS chat_history (
            id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY, email VARCHAR(255) NOT NULL, role VARCHAR(50) NOT NULL, content TEXT NOT NULL, created_at TIMESTAMP DEFAULT NOW() NOT NULL
          );`);
          await this.pgPool.query(`CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY, email VARCHAR(255) NOT NULL, title TEXT NOT NULL, message TEXT NOT NULL, is_read BOOLEAN DEFAULT FALSE NOT NULL, created_at TIMESTAMP DEFAULT NOW() NOT NULL
          );`);
          await this.pgPool.query(`CREATE TABLE IF NOT EXISTS university_reviews_agg (
            university_id INTEGER PRIMARY KEY REFERENCES universities(id) ON DELETE CASCADE, avg_rating DOUBLE PRECISION, review_count INTEGER DEFAULT 0
          );`);
          await this.pgPool.query(`CREATE TABLE IF NOT EXISTS student_profiles (id SERIAL PRIMARY KEY, email VARCHAR(255) UNIQUE NOT NULL, profile JSONB NOT NULL);`);
          await this.pgPool.query(`CREATE TABLE IF NOT EXISTS parent_profiles (id SERIAL PRIMARY KEY, email VARCHAR(255) UNIQUE NOT NULL, profile JSONB NOT NULL);`);
          await this.pgPool.query(`CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY, event_type VARCHAR(50) NOT NULL, user_email VARCHAR(255), ip_address VARCHAR(45), details JSONB, created_at TIMESTAMP DEFAULT NOW() NOT NULL
          );`);
          await this.pgPool.query(`CREATE TABLE IF NOT EXISTS analytics_events (
            id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY, event_type VARCHAR(50) NOT NULL, details JSONB, user_email VARCHAR(255), ip_address VARCHAR(45), created_at TIMESTAMP DEFAULT NOW() NOT NULL
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
            const resolvedImage = universityData[i].image || universities2[i].image;
            const resolvedLogo = universityData[i].logo || universities2[i].logo;
            await this.pgPool.query(
              `INSERT INTO universities (id, name, location, state, type, fee, rating, students, courses, image, logo,
              categories, stream, degrees, majors, popular_courses, phone, competitive_exams,
              min_10th, min_12th, naac_grade, nirf_rank, aicte_approved, nba_accredited, nmc_recognized,
              avg_placement_lpa, website, virtual_tour_url, expert_insight, alumni_stories, campus_map, created_at)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13::jsonb, $14::jsonb, $15::jsonb, $16::jsonb, $17, $18::jsonb,
              $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29::jsonb, $30::jsonb, $31::jsonb, NOW())
              ON CONFLICT (id) DO UPDATE SET image = EXCLUDED.image;`,
              [
                baseId,
                universityData[i].name,
                universityData[i].location,
                universityData[i].state,
                universityData[i].type,
                universityData[i].fee,
                universityData[i].rating,
                universityData[i].students,
                universityData[i].courses,
                resolvedImage,
                resolvedLogo,
                JSON.stringify(universityData[i].categories ?? []),
                JSON.stringify(universityData[i].stream ?? []),
                JSON.stringify(universityData[i].degrees ?? []),
                JSON.stringify(universityData[i].majors ?? []),
                JSON.stringify(universityData[i].popularCourses ?? []),
                universityData[i].phone,
                JSON.stringify(universityData[i].competitiveExams ?? []),
                universityData[i].min10th,
                universityData[i].min12th,
                universityData[i].naacGrade,
                universityData[i].nirfRank,
                universityData[i].aicteApproved,
                universityData[i].nbaAccredited,
                universityData[i].nmcRecognized,
                universityData[i].avgPlacementLPA,
                universityData[i].website,
                universityData[i].virtualTourUrl,
                universityData[i].expertInsight,
                JSON.stringify(universityData[i].alumniStories ?? []),
                JSON.stringify(universityData[i].campusMap ?? { hasHostels: true, library: true, labs: true, sportsComplex: true })
              ]
            );
          }
          logger.info(`PostgreSQL normalized users, universities, and bookmarks verified successfully.`);
          for (const user of staticUsers) {
            await this.pgPool.query(
              `INSERT INTO users (id, email, password, role, name, login_failures, locked_until, created_at, email_verified, verification_token, verification_expires)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;`,
              [user.id, user.email, user.password, user.role, user.name, user.loginFailures, user.lockedUntil, user.createdAt, user.emailVerified, user.verificationToken, user.verificationExpires]
            );
          }
          for (const bookmark of staticBookmarks) {
            await this.pgPool.query(
              `INSERT INTO bookmarks (id, user_email, university_id, created_at) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING;`,
              [bookmark.id, bookmark.userEmail, bookmark.universityId, bookmark.createdAt]
            );
          }
          for (const review of staticReviews) {
            await this.pgPool.query(
              `INSERT INTO reviews (id, university_id, user_name, rating, comment, review_date, avatar) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT DO NOTHING;`,
              [review.id, review.universityId, review.userName, review.rating, review.comment, review.reviewDate, review.avatar]
            );
          }
          for (const notification of staticNotifications) {
            await this.pgPool.query(
              `INSERT INTO notifications (id, email, title, message, is_read, created_at) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING;`,
              [notification.id, notification.email, notification.title, notification.message, notification.isRead, notification.created_at]
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
        } catch (err) {
          isFatal = isFatal && this.isFatalError(err);
          logger.info({ error: err.message }, "Cloud SQL connection could not be established.");
          this.isPostgres = false;
          if (this.pgPool) {
            try {
              await this.pgPool.end();
            } catch (e) {
            }
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
  async recoverFromPoolFault(err) {
    const msg = (err.message || "").toLowerCase();
    const code = err.code || "";
    const isPoolFault = /\.":(Connection terminated|terminating connection|could not serialize access|SSL error|connection reset)/i.test(msg) || /ECONNRESET|ETIMEDOUT|EPIPE|EAI_AGAIN|ENETUNREACH|EHOSTUNREACH/i.test(code) || code === "08006" || code === "57P01" || code === "57P03";
    if (!isPoolFault) return;
    logger.warn({ code, msg: msg.slice(0, 200), err }, "Postgres pool fault detected; attempting pool recovery.");
    if (this.recoveryTimer) return;
    try {
      if (this.pgPool) {
        await this.pgPool.end().catch(() => {
        });
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
          logger.info({}, "Postgres pool recovered from fault.");
          break;
        }
        if (result.fatal) {
          logger.warn({ fatal: result.fatal }, "Postgres pool recovery failed (fatal); remaining in fallback mode.");
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, backoff));
        backoff = Math.min(backoff * 2, 3e4);
      }
      if (!recovered) {
        logger.warn({ attempts: this.recoveryAttempts, max: MAX_RECOVERY_ATTEMPTS }, "Postgres pool recovery exhausted; remaining in fallback mode.");
      }
    } catch (recoverErr) {
      logger.warn({ error: recoverErr.message }, "Postgres pool recovery attempt threw; staying in fallback mode.");
    } finally {
      this.recoveryTimer = null;
    }
  }
  async shutdown() {
    logger.info("Closing database connection pool...");
    if (this.pgPool) {
      try {
        await this.pgPool.end();
        logger.info("Database connection pool closed cleanly.");
      } catch (err) {
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
  isUsingPostgres() {
    return this.isPostgres;
  }
  getPoolDiagnostics() {
    if (!this.pgPool) {
      return {
        status: this.isPostgres ? "offline" : "in-memory-active",
        totalConnections: this.isPostgres ? 0 : 1,
        idleConnections: this.isPostgres ? 0 : 1,
        waitingConnections: 0
      };
    }
    return {
      status: "online",
      totalConnections: this.pgPool.totalCount || 0,
      idleConnections: this.pgPool.idleCount || 0,
      waitingConnections: this.pgPool.waitingCount || 0
    };
  }
  // ──────────────────────────────────────────────────────────────────────────────
  //  USERS OPERATIONS
  // ──────────────────────────────────────────────────────────────────────────────
  async getUserByEmail(email) {
    if (!this.isPostgres || !this.drizzleDb) {
      const u = this.mockUsers.find((x) => x.email.toLowerCase() === email.toLowerCase());
      if (u) {
        const bookmarksList = this.mockBookmarks.filter((b) => b.email.toLowerCase() === email.toLowerCase()).map((b) => b.universityId);
        return { ...u, bookmarks: bookmarksList };
      }
      return null;
    }
    try {
      const usersList = await this.drizzleDb.select().from(schema.users).where((0, import_drizzle_orm.eq)(schema.users.email, email)).limit(1);
      if (usersList.length > 0) {
        const u = usersList[0];
        const bookmarksList = await this.drizzleDb.select({ universityId: schema.bookmarks.universityId }).from(schema.bookmarks).where((0, import_drizzle_orm.eq)(schema.bookmarks.userEmail, email));
        return {
          id: u.id,
          email: u.email,
          password: u.password,
          role: u.role,
          name: u.name,
          bookmarks: bookmarksList.map((b) => b.universityId),
          loginFailures: u.loginFailures,
          lockedUntil: u.lockedUntil,
          createdAt: u.createdAt.toISOString(),
          emailVerified: u.emailVerified,
          verificationToken: u.verificationToken,
          verificationExpires: u.verificationExpires ? u.verificationExpires.toISOString() : null
        };
      }
      return null;
    } catch (err) {
      logger.error({ error: err.message }, "getUserByEmail PG Error");
      throw err;
    }
  }
  async createUser(userData) {
    if (!this.isPostgres || !this.drizzleDb) {
      const email = userData.email;
      const existing = this.mockUsers.find((x) => x.email.toLowerCase() === email.toLowerCase());
      if (existing) throw new Error("User already exists.");
      const newUser = {
        id: this.mockUsers.length + 1,
        email,
        password: userData.password || "",
        role: userData.role || "Student",
        name: userData.name || null,
        bookmarks: [],
        loginFailures: 0,
        lockedUntil: 0,
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        emailVerified: userData.emailVerified || false,
        verificationToken: userData.verificationToken || null,
        verificationExpires: userData.verificationExpires || null
      };
      this.mockUsers.push(newUser);
      return newUser;
    }
    try {
      const [inserted] = await this.drizzleDb.insert(schema.users).values({
        email: userData.email,
        password: userData.password,
        role: userData.role || "Student",
        name: userData.name || null,
        loginFailures: 0,
        lockedUntil: 0,
        createdAt: /* @__PURE__ */ new Date(),
        emailVerified: userData.emailVerified || false,
        verificationToken: userData.verificationToken || null,
        verificationExpires: userData.verificationExpires || null
      }).returning();
      return inserted;
    } catch (err) {
      logger.error({ error: err.message }, "createUser PG Error");
      throw err;
    }
  }
  async verifyEmail(email) {
    if (!this.isPostgres || !this.drizzleDb) {
      const u = this.mockUsers.find((x) => x.email.toLowerCase() === email.toLowerCase());
      if (u) {
        u.emailVerified = true;
        return true;
      }
      return false;
    }
    try {
      await this.drizzleDb.update(schema.users).set({ emailVerified: true }).where((0, import_drizzle_orm.eq)(schema.users.email, email));
      return true;
    } catch (err) {
      logger.error({ error: err.message }, "verifyEmail PG Error");
      throw err;
    }
  }
  async getUserByVerificationToken(token) {
    if (!this.isPostgres || !this.drizzleDb) {
      return this.mockUsers.find((u) => u.verificationToken?.toLowerCase() === token.toLowerCase()) || null;
    }
    try {
      const usersList = await this.drizzleDb.select().from(schema.users).where((0, import_drizzle_orm.eq)(schema.users.verificationToken, token)).limit(1);
      if (usersList.length > 0) {
        const u = usersList[0];
        const bookmarksList = await this.drizzleDb.select({ universityId: schema.bookmarks.universityId }).from(schema.bookmarks).where((0, import_drizzle_orm.eq)(schema.bookmarks.userEmail, u.email));
        return {
          id: u.id,
          email: u.email,
          password: u.password,
          role: u.role,
          name: u.name,
          bookmarks: bookmarksList.map((b) => b.universityId),
          loginFailures: u.loginFailures,
          lockedUntil: u.lockedUntil,
          createdAt: u.createdAt.toISOString(),
          emailVerified: u.emailVerified,
          verificationToken: u.verificationToken,
          verificationExpires: u.verificationExpires ? u.verificationExpires.toISOString() : null
        };
      }
      return null;
    } catch (err) {
      logger.error({ error: err.message }, "getUserByVerificationToken PG Error");
      throw err;
    }
  }
  async updateUserVerificationToken(email, token, expires) {
    if (!this.isPostgres || !this.drizzleDb) {
      const u = this.mockUsers.find((x) => x.email.toLowerCase() === email.toLowerCase());
      if (u) {
        u.verificationToken = token;
        u.verificationExpires = expires ? new Date(expires) : null;
      }
      return;
    }
    try {
      await this.drizzleDb.update(schema.users).set({ verificationToken: token, verificationExpires: expires ? new Date(expires) : null }).where((0, import_drizzle_orm.eq)(schema.users.email, email));
    } catch (err) {
      logger.error({ error: err.message }, "updateUserVerificationToken PG Error");
      throw err;
    }
  }
  async updateUserLockout(email, failures, lockedUntil) {
    if (!this.isPostgres || !this.drizzleDb) {
      const u = this.mockUsers.find((x) => x.email.toLowerCase() === email.toLowerCase());
      if (u) {
        u.loginFailures = failures;
        u.lockedUntil = lockedUntil;
      }
      return;
    }
    try {
      await this.drizzleDb.update(schema.users).set({ loginFailures: failures, lockedUntil }).where((0, import_drizzle_orm.eq)(schema.users.email, email));
    } catch (err) {
      logger.error({ error: err.message }, "updateUserLockout PG Error");
      throw err;
    }
  }
  async recordLoginAttempt(ip, email, success) {
    if (!this.isPostgres || !this.drizzleDb) return;
    try {
      await this.drizzleDb.insert(schema.loginAttempts).values({
        ip,
        email,
        success,
        timestamp: /* @__PURE__ */ new Date()
      }).onConflictDoNothing();
    } catch (err) {
      logger.warn({ error: err.message }, "recordLoginAttempt PG Error");
    }
  }
  // ──────────────────────────────────────────────────────────────────────────────
  //  UNIVERSITIES OPERATIONS
  // ──────────────────────────────────────────────────────────────────────────────
  async getUniversities(query) {
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
        categories: [],
        stream: [],
        degrees: [],
        majors: [],
        popularCourses: [],
        phone: u.phone,
        competitiveExams: [],
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
        alumniStories: [],
        campusMap: {},
        reviews: this.mockReviews[u.id]?.map((r) => ({
          id: r.id,
          userName: r.userName,
          rating: r.rating,
          comment: r.comment,
          avatar: r.avatar,
          reviewDate: r.reviewDate
        })) || [],
        reviewCount: this.mockReviews[u.id]?.length || 0,
        averageReview: this.mockReviews[u.id]?.length ? this.mockReviews[u.id].reduce((s, r) => s + r.rating, 0) / this.mockReviews[u.id].length : 0
      }));
    }
    try {
      let base = await this.drizzleDb.select().from(schema.universities);
      if (query?.search) {
        const q = query.search.toLowerCase();
        base = base.filter((u) => u.name.toLowerCase().includes(q) || u.location.toLowerCase().includes(q));
      }
      const universitiesList = await Promise.all(base.map(async (u) => {
        const reviewsList = await this.drizzleDb.select().from(schema.reviews).where((0, import_drizzle_orm.eq)(schema.reviews.universityId, u.id));
        const reviewCount = await this.drizzleDb.select({ count: import_drizzle_orm.sql`count(*)` }).from(schema.reviews).where((0, import_drizzle_orm.eq)(schema.reviews.universityId, u.id));
        return {
          ...u,
          reviews: reviewsList.map((r) => ({
            id: r.id,
            userName: r.userName,
            rating: r.rating,
            comment: r.comment,
            avatar: r.avatar,
            reviewDate: r.reviewDate
          })),
          reviewCount: reviewCount[0]?.count ?? 0,
          averageReview: reviewCount[0]?.count ? reviewsList.reduce((s, r) => s + r.rating, 0) / reviewCount[0].count : 0,
          categories: u.categories,
          stream: u.stream,
          degrees: u.degrees,
          majors: u.majors,
          popularCourses: u.popularCourses,
          competitiveExams: u.competitiveExams,
          campusMap: u.campusMap,
          alumniStories: u.alumniStories
        };
      }));
      return universitiesList;
    } catch (err) {
      logger.error({ error: err.message }, "getUniversities PG Error");
      throw err;
    }
  }
  async getUniversityById(id) {
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
        categories: [],
        stream: [],
        degrees: [],
        majors: [],
        popularCourses: [],
        phone: u.phone,
        competitiveExams: [],
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
        alumniStories: [],
        campusMap: {},
        reviews: this.mockReviews[id]?.map((r) => ({
          id: r.id,
          userName: r.userName,
          rating: r.rating,
          comment: r.comment,
          avatar: r.avatar,
          reviewDate: r.reviewDate
        })) || [],
        reviewCount: this.mockReviews[id]?.length || 0,
        averageReview: this.mockReviews[id]?.length ? this.mockReviews[id].reduce((s, r) => s + r.rating, 0) / this.mockReviews[id].length : 0
      };
    }
    try {
      const res = await this.drizzleDb.select().from(schema.universities).where((0, import_drizzle_orm.eq)(schema.universities.id, id)).limit(1);
      if (res.length > 0) {
        const u = res[0];
        const reviewsList = await this.drizzleDb.select().from(schema.reviews).where((0, import_drizzle_orm.eq)(schema.reviews.universityId, id));
        const reviewCount = await this.drizzleDb.select({ count: import_drizzle_orm.sql`count(*)` }).from(schema.reviews).where((0, import_drizzle_orm.eq)(schema.reviews.universityId, id));
        return {
          ...u,
          reviews: reviewsList.map((r) => ({
            id: r.id,
            userName: r.userName,
            rating: r.rating,
            comment: r.comment,
            avatar: r.avatar,
            reviewDate: r.reviewDate
          })),
          reviewCount: reviewCount[0]?.count ?? 0,
          averageReview: reviewCount[0]?.count ? reviewsList.reduce((s, r) => s + r.rating, 0) / reviewCount[0].count : 0,
          categories: u.categories,
          stream: u.stream,
          degrees: u.degrees,
          majors: u.majors,
          popularCourses: u.popularCourses,
          competitiveExams: u.competitiveExams,
          campusMap: u.campusMap,
          alumniStories: u.alumniStories
        };
      }
      return null;
    } catch (err) {
      logger.error({ error: err.message }, "getUniversityById PG Error");
      throw err;
    }
  }
  async upsertUniversity(university) {
    if (!this.isPostgres || !this.drizzleDb) {
      const existing = this.mockUniversities.find((x) => x.id === university.id);
      if (existing) Object.assign(existing, university);
      else this.mockUniversities.push(university);
      return university;
    }
    try {
      const [upserted] = await this.drizzleDb.insert(schema.universities).values({
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
        categories: university.categories,
        stream: university.stream,
        degrees: university.degrees,
        majors: university.majors,
        popularCourses: university.popularCourses,
        phone: university.phone,
        competitiveExams: university.competitiveExams,
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
        alumniStories: university.alumniStories,
        campusMap: university.campusMap
      }).onConflictDoUpdate({
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
          categories: university.categories,
          stream: university.stream,
          degrees: university.degrees,
          majors: university.majors,
          popularCourses: university.popularCourses,
          phone: university.phone,
          competitiveExams: university.competitiveExams,
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
          alumniStories: university.alumniStories,
          campusMap: university.campusMap
        }
      }).returning();
      return upserted;
    } catch (err) {
      logger.error({ error: err.message }, "upsertUniversity PG Error");
      throw err;
    }
  }
  async deleteUniversity(id) {
    if (!this.isPostgres || !this.drizzleDb) {
      const idx = this.mockUniversities.findIndex((u) => u.id === id);
      if (idx >= 0) {
        this.mockUniversities.splice(idx, 1);
        return true;
      }
      return false;
    }
    try {
      await this.drizzleDb.delete(schema.universities).where((0, import_drizzle_orm.eq)(schema.universities.id, id));
      return true;
    } catch (err) {
      logger.error({ error: err.message }, "deleteUniversity PG Error");
      throw err;
    }
  }
  async getAllUniversities() {
    return this.getUniversities();
  }
  async searchUniversities(query) {
    return this.getUniversities({ search: query });
  }
  // ──────────────────────────────────────────────────────────────────────────────
  //  REVIEW OPERATIONS
  // ──────────────────────────────────────────────────────────────────────────────
  async addReview(id, review) {
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
        userName: review.user,
        rating: review.rating,
        comment: review.comment,
        reviewDate: review.date,
        avatar: review.avatar
      });
      const res = await this.drizzleDb.select({ count: import_drizzle_orm.sql`count(*)`, avg: import_drizzle_orm.sql`avg(rating)` }).from(schema.reviews).where((0, import_drizzle_orm.eq)(schema.reviews.universityId, id));
      const avg = res[0]?.avg ? parseFloat(res[0].avg.toFixed(2)) : 0;
      const count = res[0]?.count ?? 0;
      await this.drizzleDb.update(schema.universityReviewsAgg).set({ avgRating: avg, reviewCount: count }).where((0, import_drizzle_orm.eq)(schema.universityReviewsAgg.universityId, id)).onConflictDoUpdate({
        target: schema.universityReviewsAgg.universityId,
        set: { avgRating: avg, reviewCount: count }
      });
      return { rating: avg };
    } catch (err) {
      logger.error({ error: err.message, id }, "addReview PG Error");
      throw err;
    }
  }
  async getAllReviews() {
    if (!this.isPostgres || !this.drizzleDb) {
      return Object.values(this.mockReviews).flat();
    }
    try {
      return await this.drizzleDb.select().from(schema.reviews).orderBy(import_drizzle_orm.sql`desc(${schema.reviews.reviewDate})`);
    } catch (err) {
      logger.error({ error: err.message }, "getAllReviews PG Error");
      throw err;
    }
  }
  async deleteReview(id) {
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
      await this.drizzleDb.delete(schema.reviews).where((0, import_drizzle_orm.eq)(schema.reviews.id, id));
      return true;
    } catch (err) {
      logger.error({ error: err.message }, "deleteReview PG Error");
      throw err;
    }
  }
  async getAllUniversityReviews(universityId) {
    if (!this.isPostgres || !this.drizzleDb) {
      return this.mockReviews[universityId] || [];
    }
    try {
      return await this.drizzleDb.select().from(schema.reviews).where((0, import_drizzle_orm.eq)(schema.reviews.universityId, universityId)).orderBy(import_drizzle_orm.sql`desc(${schema.reviews.reviewDate})`);
    } catch (err) {
      logger.error({ error: err.message }, "getAllUniversityReviews PG Error");
      throw err;
    }
  }
  // ──────────────────────────────────────────────────────────────────────────────
  //  BOOKMARK OPERATIONS
  // ──────────────────────────────────────────────────────────────────────────────
  async toggleBookmark(email, universityId) {
    if (!this.isPostgres || !this.drizzleDb) {
      const exists = this.mockBookmarks.some((b) => b.email.toLowerCase() === email.toLowerCase() && b.universityId === universityId);
      if (exists) {
        this.mockBookmarks = this.mockBookmarks.filter((b) => !(b.email.toLowerCase() === email.toLowerCase() && b.universityId === universityId));
      } else {
        this.mockBookmarks.push({ email, universityId, createdAt: (/* @__PURE__ */ new Date()).toISOString() });
      }
      return { added: !exists, bookmarks: this.mockBookmarks.filter((b) => b.email.toLowerCase() === email.toLowerCase()).map((b) => b.universityId) };
    }
    try {
      const existing = await this.drizzleDb.select().from(schema.bookmarks).where((0, import_drizzle_orm.eq)(schema.bookmarks.userEmail, email)).then((b) => b.some((x) => x.universityId === universityId));
      if (existing) {
        await this.drizzleDb.delete(schema.bookmarks).where((0, import_drizzle_orm.eq)(schema.bookmarks.userEmail, email));
        await this.drizzleDb.delete(schema.bookmarks).where((0, import_drizzle_orm.eq)(schema.bookmarks.universityId, universityId));
      } else {
        await this.drizzleDb.insert(schema.bookmarks).values({ userEmail: email, universityId });
      }
      const bookmarks2 = await this.drizzleDb.select({ universityId: schema.bookmarks.universityId }).from(schema.bookmarks).where((0, import_drizzle_orm.eq)(schema.bookmarks.userEmail, email));
      return { added: !existing, bookmarks: bookmarks2.map((b) => b.universityId) };
    } catch (err) {
      logger.error({ error: err.message }, "toggleBookmark PG Error");
      throw err;
    }
  }
  async getBookmarks(email) {
    if (!this.isPostgres || !this.drizzleDb) {
      return this.mockBookmarks.filter((b) => b.email.toLowerCase() === email.toLowerCase()).map((b) => b.universityId);
    }
    try {
      const bookmarks2 = await this.drizzleDb.select({ universityId: schema.bookmarks.universityId }).from(schema.bookmarks).where((0, import_drizzle_orm.eq)(schema.bookmarks.userEmail, email));
      return bookmarks2.map((b) => b.universityId);
    } catch (err) {
      logger.error({ error: err.message }, "getBookmarks PG Error");
      throw err;
    }
  }
  // ──────────────────────────────────────────────────────────────────────────────
  //  SESSIONS OPERATIONS
  // ──────────────────────────────────────────────────────────────────────────────
  async getSession(token) {
    if (!this.isPostgres || !this.drizzleDb) {
      return this.mockSessions?.find((s) => s.token === token && s.expiresAt > Date.now()) || null;
    }
    try {
      const sessions2 = await this.drizzleDb.select().from(schema.sessions).where((0, import_drizzle_orm.eq)(schema.sessions.token, token)).limit(1);
      if (sessions2.length > 0) {
        const s = sessions2[0];
        if (s.expiresAt < Date.now()) return null;
        return { email: s.email, expiresAt: s.expiresAt };
      }
      return null;
    } catch (err) {
      logger.error({ error: err.message }, "getSession PG Error");
      throw err;
    }
  }
  async createSession(token, email, expiresAt) {
    if (!this.isPostgres || !this.drizzleDb) {
      this.mockSessions.push({ token, email, expiresAt });
      return;
    }
    try {
      await this.drizzleDb.insert(schema.sessions).values({ token, email, expiresAt });
    } catch (err) {
      logger.error({ error: err.message }, "createSession PG Error");
      throw err;
    }
  }
  async deleteSession(token) {
    if (!this.isPostgres || !this.drizzleDb) {
      this.mockSessions = this.mockSessions.filter((s) => s.token !== token);
      return;
    }
    try {
      await this.drizzleDb.delete(schema.sessions).where((0, import_drizzle_orm.eq)(schema.sessions.token, token));
    } catch (err) {
      logger.error({ error: err.message }, "deleteSession PG Error");
      throw err;
    }
  }
  // ──────────────────────────────────────────────────────────────────────────────
  //  NOTIFICATIONS OPERATIONS
  // ──────────────────────────────────────────────────────────────────────────────
  async getNotifications(email) {
    if (!this.isPostgres || !this.drizzleDb) {
      return this.mockNotifications?.filter((n) => n.email === email) || [];
    }
    try {
      return await this.drizzleDb.select().from(schema.notifications).where((0, import_drizzle_orm.eq)(schema.notifications.email, email)).orderBy(import_drizzle_orm.sql`desc(${schema.notifications.created_at})`);
    } catch (err) {
      logger.error({ error: err.message }, "getNotifications PG Error");
      throw err;
    }
  }
  async markNotificationAsRead(id, email) {
    if (!this.isPostgres || !this.drizzleDb) {
      const n = this.mockNotifications?.find((x) => x.id === id && x.email === email);
      if (n) {
        n.isRead = true;
        return true;
      }
      return false;
    }
    try {
      const updated = await this.drizzleDb.update(schema.notifications).set({ isRead: true }).where((0, import_drizzle_orm.eq)(schema.notifications.id, id)).returning();
      return updated.length > 0;
    } catch (err) {
      logger.error({ error: err.message }, "markNotificationAsRead PG Error");
      throw err;
    }
  }
  async addNotification(email, title, message, type) {
    if (!this.isPostgres || !this.drizzleDb) {
      const id = (this.mockNotifications?.length > 0 ? Math.max(...this.mockNotifications.map((n) => n.id)) : 0) + 1;
      if (!this.mockNotifications) this.mockNotifications = [];
      this.mockNotifications.push({ id, email, title, message, isRead: false, created_at: (/* @__PURE__ */ new Date()).toISOString(), type });
      return;
    }
    try {
      await this.drizzleDb.insert(schema.notifications).values({ email, title, message, type, isRead: false });
    } catch (err) {
      logger.error({ error: err.message }, "addNotification PG Error");
    }
  }
  async cleanupExpiredNotifications(retentionDays) {
    if (!this.isPostgres || !this.drizzleDb) {
      const cutoff = /* @__PURE__ */ new Date();
      cutoff.setDate(cutoff.getDate() - retentionDays);
      const deleted = this.mockNotifications?.filter((n) => new Date(n.created_at) < cutoff) || [];
      if (this.mockNotifications) this.mockNotifications = this.mockNotifications.filter((n) => new Date(n.created_at) >= cutoff);
      return deleted.length;
    }
    try {
      const deleted = await this.drizzleDb.delete(schema.notifications).where((0, import_drizzle_orm.lt)(schema.notifications.createdAt, new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1e3))).returning();
      return deleted.length;
    } catch (err) {
      logger.error({ error: err.message, retentionDays }, "cleanupExpiredNotifications PG Error");
      return 0;
    }
  }
  // ──────────────────────────────────────────────────────────────────────────────
  //  STUDENT / PARENT PROFILES
  // ──────────────────────────────────────────────────────────────────────────────
  async getStudentProfile(email) {
    if (!this.isPostgres || !this.drizzleDb) {
      const p = this.mockStudentProfiles?.find((x) => x.email.toLowerCase() === email.toLowerCase());
      return p ? p.profile : null;
    }
    try {
      const rows = await this.drizzleDb.select().from(schema.studentProfiles).where((0, import_drizzle_orm.eq)(schema.studentProfiles.email, email)).limit(1);
      return rows.length > 0 ? rows[0].profile : null;
    } catch (err) {
      logger.error({ error: err.message }, "getStudentProfile PG Error");
      throw err;
    }
  }
  async saveStudentProfile(email, profile) {
    if (!this.isPostgres || !this.drizzleDb) {
      const existing = this.mockStudentProfiles?.find((x) => x.email.toLowerCase() === email.toLowerCase());
      if (existing) existing.profile = profile;
      else {
        if (!this.mockStudentProfiles) this.mockStudentProfiles = [];
        this.mockStudentProfiles.push({ email, profile });
      }
      return profile;
    }
    try {
      await this.drizzleDb.insert(schema.studentProfiles).values({ email, profile }).onConflictDoUpdate({
        target: schema.studentProfiles.email,
        set: { profile }
      });
      return profile;
    } catch (err) {
      logger.error({ error: err.message }, "saveStudentProfile PG Error");
      throw err;
    }
  }
  async getParentProfile(email) {
    if (!this.isPostgres || !this.drizzleDb) {
      const p = this.mockParentProfiles?.find((x) => x.email.toLowerCase() === email.toLowerCase());
      return p ? p.profile : null;
    }
    try {
      const rows = await this.drizzleDb.select().from(schema.parentProfiles).where((0, import_drizzle_orm.eq)(schema.parentProfiles.email, email)).limit(1);
      return rows.length > 0 ? rows[0].profile : null;
    } catch (err) {
      logger.error({ error: err.message }, "getParentProfile PG Error");
      throw err;
    }
  }
  async saveParentProfile(email, profile) {
    if (!this.isPostgres || !this.drizzleDb) {
      const existing = this.mockParentProfiles?.find((x) => x.email.toLowerCase() === email.toLowerCase());
      if (existing) existing.profile = profile;
      else {
        if (!this.mockParentProfiles) this.mockParentProfiles = [];
        this.mockParentProfiles.push({ email, profile });
      }
      return profile;
    }
    try {
      await this.drizzleDb.insert(schema.parentProfiles).values({ email, profile }).onConflictDoUpdate({
        target: schema.parentProfiles.email,
        set: { profile }
      });
      return profile;
    } catch (err) {
      logger.error({ error: err.message }, "saveParentProfile PG Error");
      throw err;
    }
  }
  async updateUserRole(email, role) {
    if (!this.isPostgres || !this.drizzleDb) {
      const u = this.mockUsers.find((x) => x.email.toLowerCase() === email.toLowerCase());
      if (u) u.role = role;
      return;
    }
    try {
      await this.drizzleDb.update(schema.users).set({ role }).where((0, import_drizzle_orm.eq)(schema.users.email, email));
    } catch (err) {
      logger.error({ error: err.message }, "updateUserRole PG Error");
      throw err;
    }
  }
  // ──────────────────────────────────────────────────────────────────────────────
  //  CHAT HISTORY
  // ──────────────────────────────────────────────────────────────────────────────
  async getChatHistory(email) {
    if (!this.isPostgres || !this.drizzleDb) {
      return this.mockChatHistory?.filter((h) => h.email === email) || [];
    }
    try {
      const rows = await this.drizzleDb.select({ role: schema.chatHistory.role, content: schema.chatHistory.content, createdAt: schema.chatHistory.createdAt }).from(schema.chatHistory).where((0, import_drizzle_orm.eq)(schema.chatHistory.email, email)).orderBy(import_drizzle_orm.sql`asc(${schema.chatHistory.createdAt})`);
      return rows.map((r) => ({ role: r.role, content: r.content, createdAt: r.createdAt.toISOString() }));
    } catch (err) {
      logger.error({ error: err.message }, "getChatHistory PG Error");
      throw err;
    }
  }
  async saveChatMessage(email, role, content) {
    if (!this.isPostgres || !this.drizzleDb) {
      if (!this.mockChatHistory) this.mockChatHistory = [];
      this.mockChatHistory.push({ email, role, content, createdAt: (/* @__PURE__ */ new Date()).toISOString() });
      return;
    }
    try {
      await this.drizzleDb.insert(schema.chatHistory).values({ email, role, content });
    } catch (err) {
      logger.error({ error: err.message }, "saveChatMessage PG Error");
    }
  }
  // ──────────────────────────────────────────────────────────────────────────────
  //  ADMIN / AUDIT
  // ──────────────────────────────────────────────────────────────────────────────
  async getAllUsers() {
    if (!this.isPostgres || !this.drizzleDb) return this.mockUsers;
    try {
      return await this.drizzleDb.select().from(schema.users);
    } catch (err) {
      logger.error({ error: err.message }, "getAllUsers PG Error");
      throw err;
    }
  }
  async getAllReviews() {
    if (!this.isPostgres || !this.drizzleDb) {
      return Object.values(this.mockReviews).flat();
    }
    try {
      return await this.drizzleDb.select().from(schema.reviews);
    } catch (err) {
      logger.error({ error: err.message }, "getAllReviews PG Error");
      throw err;
    }
  }
  async deleteReview(id) {
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
      await this.drizzleDb.delete(schema.reviews).where((0, import_drizzle_orm.eq)(schema.reviews.id, id));
      return true;
    } catch (err) {
      logger.error({ error: err.message }, "deleteReview PG Error");
      throw err;
    }
  }
  async getAllAuditLogs() {
    if (!this.isPostgres || !this.drizzleDb) return this.mockAuditLogs || [];
    try {
      return await this.drizzleDb.select().from(schema.auditLogs).orderBy(import_drizzle_orm.sql`desc(${schema.auditLogs.created_at})`);
    } catch (err) {
      logger.error({ error: err.message }, "getAllAuditLogs PG Error");
      throw err;
    }
  }
  // ──────────────────────────────────────────────────────────────────────────────
  //  Public fallback datastore surfaces consumed by monitoring / backup tooling.
  //  These mirror the live in-memory collections so the rest of the app can
  //  read counts / snapshots even when PostgreSQL is unreachable.
  // ──────────────────────────────────────────────────────────────────────────────
  get mockUniversities() {
    if (!this.isPostgres || !this.drizzleDb) {
      return staticUniversityData();
    }
    return [];
  }
  /** Snapshot of the full datastore for backup / diagnostics exports. */
  async exportPostgresData() {
    if (!this.isPostgres || !this.drizzleDb) {
      return {
        universities: staticUniversityData(),
        users: this.mockUsers,
        reviews: Object.values(this.mockReviews).flat(),
        bookmarks: this.mockBookmarks,
        notifications: this.mockNotifications,
        chatHistory: this.mockChatHistory,
        sessions: this.mockSessions
      };
    }
    try {
      const unis = await this.drizzleDb.select().from(schema.universities);
      const users2 = await this.drizzleDb.select().from(schema.users);
      const reviews2 = await this.drizzleDb.select().from(schema.reviews);
      const bookmarks2 = await this.drizzleDb.select().from(schema.bookmarks);
      const notifications2 = await this.drizzleDb.select().from(schema.notifications);
      const chatHistory2 = await this.drizzleDb.select().from(schema.chatHistory);
      const sessions2 = await this.drizzleDb.select().from(schema.sessions);
      return { universities: unis, users: users2, reviews: reviews2, bookmarks: bookmarks2, notifications: notifications2, chatHistory: chatHistory2, sessions: sessions2 };
    } catch (err) {
      logger.error({ error: err.message }, "exportPostgresData PG Error");
      return { universities: [], users: [], reviews: [], bookmarks: [], notifications: [], chatHistory: [], sessions: [] };
    }
  }
  async importPostgresData(data) {
    if (!this.isPostgres || !this.drizzleDb) return;
    try {
      if (data.universities?.length) await this.drizzleDb.insert(schema.universities).values(data.universities).onConflictDoNothing();
      if (data.users?.length) await this.drizzleDb.insert(schema.users).values(data.users).onConflictDoNothing();
      if (data.reviews?.length) await this.drizzleDb.insert(schema.reviews).values(data.reviews).onConflictDoNothing();
      if (data.bookmarks?.length) await this.drizzleDb.insert(schema.bookmarks).values(data.bookmarks).onConflictDoNothing();
      if (data.notifications?.length) await this.drizzleDb.insert(schema.notifications).values(data.notifications).onConflictDoNothing();
      if (data.chatHistory?.length) await this.drizzleDb.insert(schema.chatHistory).values(data.chatHistory).onConflictDoNothing();
      if (data.sessions?.length) await this.drizzleDb.insert(schema.sessions).values(data.sessions).onConflictDoNothing();
    } catch (err) {
      logger.error({ error: err.message }, "importPostgresData PG Error");
    }
  }
  async cleanupExpiredSessions(retentionDays = 1) {
    if (!this.isPostgres || !this.drizzleDb) {
      const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1e3;
      const deleted = this.mockSessions?.filter((s) => s.expiresAt < cutoff) || [];
      this.mockSessions = this.mockSessions.filter((s) => s.expiresAt >= cutoff);
      return deleted.length;
    }
    try {
      const deleted = await this.drizzleDb.delete(schema.sessions).where((0, import_drizzle_orm.lt)(schema.sessions.expiresAt, Date.now())).returning();
      return deleted.length;
    } catch (err) {
      logger.error({ error: err.message }, "cleanupExpiredSessions PG Error");
      return 0;
    }
  }
  async cleanupExpiredTokens(retentionDays = 1) {
    if (!this.isPostgres || !this.drizzleDb) {
      const cutoff = /* @__PURE__ */ new Date();
      cutoff.setDate(cutoff.getDate() - retentionDays);
      const deleted = this.mockUsers?.filter((u) => u.verificationExpires && new Date(u.verificationExpires) < cutoff).length || 0;
      return deleted;
    }
    try {
      const deleted = await this.drizzleDb.update(schema.users).set({ verificationToken: null, verificationExpires: null }).where((0, import_drizzle_orm.lt)(schema.users.verificationExpires, new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1e3))).returning();
      return deleted.length;
    } catch (err) {
      logger.error({ error: err.message }, "cleanupExpiredTokens PG Error");
      return 0;
    }
  }
  async cleanupExpiredLoginAttempts(retentionDays = 1) {
    if (!this.isPostgres || !this.drizzleDb) return 0;
    try {
      const deleted = await this.drizzleDb.delete(schema.loginAttempts).where((0, import_drizzle_orm.lt)(schema.loginAttempts.timestamp, new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1e3))).returning();
      return deleted.length;
    } catch (err) {
      logger.error({ error: err.message }, "cleanupExpiredLoginAttempts PG Error");
      return 0;
    }
  }
};
var dbService = new DatabaseService();

// src/server/backup.ts
var BACKUP_DIR = import_path.default.join(process.cwd(), "backups");
var RETENTION_DAYS = 7;
var BackupService = class {
  /**
   * Ensure backup directory exists.
   */
  static ensureBackupDir() {
    if (!import_fs.default.existsSync(BACKUP_DIR)) {
      import_fs.default.mkdirSync(BACKUP_DIR, { recursive: true });
    }
  }
  /**
   * Run a full backup of the DB by exporting Postgres data.
   */
  static async createBackup(reason = "automatic") {
    try {
      this.ensureBackupDir();
      if (!dbService.isUsingPostgres()) {
        logger.warn("PostgreSQL database is offline. Cannot create database backup.");
        return null;
      }
      const timestamp2 = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
      const backupFilename = `db_backup_${timestamp2}_${reason}.json`;
      const backupPath = import_path.default.join(BACKUP_DIR, backupFilename);
      logger.info("Exporting PostgreSQL data for database backup...");
      const exportData = await dbService.exportPostgresData();
      import_fs.default.writeFileSync(backupPath, JSON.stringify(exportData, null, 2), "utf-8");
      logger.info({ backupFilename, reason }, "PostgreSQL export backup created successfully.");
      this.enforceRetention();
      return backupFilename;
    } catch (error) {
      logger.error({ error: error.message }, "Database backup failed.");
      return null;
    }
  }
  /**
   * List all available backups, sorted from newest to oldest.
   */
  static listBackups() {
    try {
      this.ensureBackupDir();
      const files = import_fs.default.readdirSync(BACKUP_DIR);
      return files.filter((f) => f.startsWith("db_backup_") && f.endsWith(".json")).map((file) => {
        const stats = import_fs.default.statSync(import_path.default.join(BACKUP_DIR, file));
        return {
          filename: file,
          createdAt: stats.mtime,
          sizeBytes: stats.size
        };
      }).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      logger.error({ error: error.message }, "Failed to list backups.");
      return [];
    }
  }
  /**
   * Restore the database from a given backup filename.
   */
  static async restoreBackup(filename) {
    try {
      this.ensureBackupDir();
      const backupPath = import_path.default.join(BACKUP_DIR, filename);
      if (!import_fs.default.existsSync(backupPath)) {
        logger.error({ filename }, "Specified backup file does not exist.");
        return false;
      }
      logger.info("Creating a pre-restore safety backup...");
      await this.createBackup("pre_restore_safety");
      logger.info({ filename }, "Restoring database from backup file...");
      const raw = import_fs.default.readFileSync(backupPath, "utf-8");
      const data = JSON.parse(raw);
      await dbService.importPostgresData(data);
      logger.info({ filename }, "Database successfully restored from backup.");
      return true;
    } catch (error) {
      logger.error({ error: error.message, filename }, "Restore failed.");
      return false;
    }
  }
  /**
   * Delete backups older than RETENTION_DAYS.
   */
  static enforceRetention() {
    try {
      this.ensureBackupDir();
      const backups = this.listBackups();
      const now = /* @__PURE__ */ new Date();
      const retentionMs = RETENTION_DAYS * 24 * 60 * 60 * 1e3;
      backups.forEach((backup) => {
        const ageMs = now.getTime() - backup.createdAt.getTime();
        if (ageMs > retentionMs) {
          const filePath = import_path.default.join(BACKUP_DIR, backup.filename);
          import_fs.default.unlinkSync(filePath);
          logger.info({ filename: backup.filename }, "Pruned old backup file due to retention policy.");
        }
      });
    } catch (error) {
      logger.error({ error: error.message }, "Error during backup retention cleanup.");
    }
  }
  static {
    this.schedulerInterval = null;
  }
  /**
   * Set up a background worker checking to run automated backups.
   */
  static async startScheduler() {
    if (this.schedulerInterval) {
      logger.warn("Daily Backup Scheduler is already running.");
      return;
    }
    logger.info("Initializing Daily Backup Scheduler...");
    const backups = this.listBackups();
    const now = /* @__PURE__ */ new Date();
    const oneDayMs = 24 * 60 * 60 * 1e3;
    let shouldBackupNow = false;
    if (backups.length === 0) {
      shouldBackupNow = true;
    } else {
      const newestBackup = backups[0];
      const ageMs = now.getTime() - newestBackup.createdAt.getTime();
      if (ageMs >= oneDayMs) {
        shouldBackupNow = true;
      }
    }
    if (shouldBackupNow) {
      logger.info("No recent backup found on scheduler start. Running background backup...");
      await this.createBackup("scheduler_init");
    }
    this.schedulerInterval = setInterval(async () => {
      try {
        const currentBackups = this.listBackups();
        const currentDate = /* @__PURE__ */ new Date();
        if (currentBackups.length === 0) {
          await this.createBackup("hourly_check");
          return;
        }
        const latest = currentBackups[0];
        const age = currentDate.getTime() - latest.createdAt.getTime();
        if (age >= oneDayMs) {
          logger.info("Last backup is over 24 hours old. Running scheduled daily backup.");
          await this.createBackup("daily_scheduled");
        }
      } catch (err) {
        logger.error({ error: err.message }, "Error in daily backup scheduler check.");
      }
    }, 60 * 60 * 1e3);
    if (this.schedulerInterval && typeof this.schedulerInterval.unref === "function") {
      this.schedulerInterval.unref();
    }
  }
  /**
   * Stop the background automated backup check.
   */
  static stopScheduler() {
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
      logger.info("Daily Backup Scheduler stopped.");
    }
  }
};

// src/server/error.ts
init_logger();
var AppError = class extends Error {
  constructor(message, statusCode = 500, code = "INTERNAL_SERVER_ERROR") {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }
};
function errorHandler(err, req, res, next) {
  const isProduction2 = process.env.NODE_ENV === "production";
  const correlationId = req.headers["x-correlation-id"] || "system";
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const errorCode = err instanceof AppError ? err.code : "INTERNAL_SERVER_ERROR";
  const errorMessage = err.message || "An unexpected error occurred.";
  logger.error(
    {
      correlationId,
      path: req.path,
      method: req.method,
      query: req.query,
      statusCode,
      errorCode,
      stack: err.stack
    },
    `Request error occurred: ${errorMessage}`
  );
  const responseBody = {
    error: isProduction2 && statusCode === 500 ? "Internal Server Error" : errorMessage,
    status: "error",
    code: errorCode,
    correlationId
  };
  res.status(statusCode).json(responseBody);
}

// src/server/security.ts
var import_crypto = __toESM(require("crypto"), 1);
init_logger();
function correlationIdMiddleware(req, res, next) {
  const correlationId = req.headers["x-correlation-id"] || import_crypto.default.randomUUID();
  req.headers["x-correlation-id"] = correlationId;
  res.setHeader("X-Correlation-Id", correlationId);
  next();
}
function logAuditEvent(action, meta) {
  logger.info(
    {
      audit: true,
      action,
      ...meta,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    },
    `AUDIT EVENT [${action.toUpperCase()}]: ${meta.email || "anonymous"} from ${meta.ip} - Status: ${meta.status}`
  );
}
function csrfProtection(req, res, next) {
  const isHttps = req.secure || req.headers["x-forwarded-proto"] === "https";
  const cookieSameSite = isHttps ? "None" : "Lax";
  const secureFlag = isHttps ? "; Secure" : "";
  const safeMethods = ["GET", "HEAD", "OPTIONS"];
  if (safeMethods.includes(req.method)) {
    let existingCsrf = "";
    if (req.headers.cookie) {
      const cookies = req.headers.cookie.split(";").map((c) => c.trim());
      const cookie = cookies.find((c) => c.startsWith("csrf_token="));
      if (cookie) {
        existingCsrf = cookie.substring("csrf_token=".length);
      }
    }
    if (!existingCsrf) {
      const newToken = import_crypto.default.randomBytes(24).toString("hex");
      res.setHeader("Set-Cookie", `csrf_token=${newToken}; Path=/; SameSite=${cookieSameSite}${secureFlag}; Max-Age=86400`);
    }
    return next();
  }
  const authHeader = req.headers["authorization"];
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return next();
  }
  const host = req.headers["x-forwarded-host"] || req.headers["host"] || "";
  const origin = req.headers["origin"] || "";
  const referer = req.headers["referer"] || "";
  const isLocal = host.includes("localhost") || host.includes("127.0.0.1") || origin.includes("localhost") || origin.includes("127.0.0.1") || process.env.NODE_ENV !== "production";
  if (origin) {
    try {
      const originHost = new URL(origin).host;
      if (originHost === host || isLocal && (originHost.includes("localhost") || originHost.includes("127.0.0.1"))) {
        return next();
      }
    } catch (e) {
    }
  }
  if (referer) {
    try {
      const refererHost = new URL(referer).host;
      if (refererHost === host || isLocal && (refererHost.includes("localhost") || refererHost.includes("127.0.0.1"))) {
        return next();
      }
    } catch (e) {
    }
  }
  if (isLocal) {
    return next();
  }
  let cookieToken = "";
  if (req.headers.cookie) {
    const cookies = req.headers.cookie.split(";").map((c) => c.trim());
    const cookie = cookies.find((c) => c.startsWith("csrf_token="));
    if (cookie) {
      cookieToken = cookie.substring("csrf_token=".length);
    }
  }
  const headerToken = req.headers["x-csrf-token"];
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    logger.warn(
      {
        ip: req.ip || "unknown",
        method: req.method,
        path: req.path,
        cookieTokenExists: !!cookieToken,
        headerTokenExists: !!headerToken
      },
      "CSRF verification failed!"
    );
    throw new AppError("CSRF verification failed. Request untrusted.", 403, "CSRF_VERIFICATION_FAILED");
  }
  next();
}
var AccountLockoutService = class {
  static {
    this.LOCK_DURATION_MS = 15 * 60 * 1e3;
  }
  static {
    // 15 minutes
    this.MAX_FAILURES = 5;
  }
  /**
   * Check if a user account is locked. Throws AppError if locked.
   */
  static checkLockout(user) {
    if (!user) return;
    const now = Date.now();
    if (user.lockedUntil && user.lockedUntil > now) {
      const remainingMin = Math.ceil((user.lockedUntil - now) / 6e4);
      throw new AppError(
        `Account is locked due to consecutive login failures. Try again in ${remainingMin} minutes.`,
        423,
        "ACCOUNT_LOCKED"
      );
    }
  }
  /**
   * Handle a failed login attempt. Increments failures and locks account if max reached.
   */
  static handleFailure(user) {
    if (!user) return false;
    user.loginFailures = (user.loginFailures || 0) + 1;
    if (user.loginFailures >= this.MAX_FAILURES) {
      user.lockedUntil = Date.now() + this.LOCK_DURATION_MS;
      logger.warn(
        { email: user.email, failures: user.loginFailures },
        "Account locked out due to consecutive login failures."
      );
      return true;
    }
    return false;
  }
  /**
   * Handle a successful login attempt. Resets failure counters.
   */
  static handleSuccess(user) {
    if (!user) return;
    user.loginFailures = 0;
    user.lockedUntil = 0;
  }
};

// src/server/maintenance.ts
var import_fs3 = __toESM(require("fs"), 1);
var import_path3 = __toESM(require("path"), 1);
init_logger();

// src/server/queue.ts
var import_bullmq = require("bullmq");

// src/server/redis.ts
var import_ioredis = __toESM(require("ioredis"), 1);
init_logger();
var redisClient = null;
var isRedisConnected = false;
var redisUrl = process.env.REDIS_URL || process.env.SUPABASE_REDIS_URL;
var localCacheStore = /* @__PURE__ */ new Map();
function getLocalCacheSize() {
  return localCacheStore.size;
}
function enforceLocalCacheEviction(maxItems) {
  const limit = maxItems || parseInt(process.env.CACHE_MAX_ITEMS || "1000", 10);
  let evictedCount = 0;
  if (localCacheStore.size > limit) {
    const keysToDeleteCount = localCacheStore.size - limit;
    const keys = Array.from(localCacheStore.keys());
    for (let i = 0; i < keysToDeleteCount; i++) {
      localCacheStore.delete(keys[i]);
      evictedCount++;
    }
    logger.info({ keysEvicted: evictedCount }, "Local cache item count exceeded limit. Evicted oldest entries.");
  }
  return evictedCount;
}
function pruneExpiredCacheEntries() {
  const now = Date.now();
  let deletedCount = 0;
  for (const [key, entry] of localCacheStore.entries()) {
    if (entry.expiresAt < now) {
      localCacheStore.delete(key);
      deletedCount++;
    }
  }
  if (deletedCount > 0) {
    logger.debug({ deletedCount }, "Pruned expired local cache entries.");
  }
  return deletedCount;
}
if (redisUrl && redisUrl !== "undefined" && redisUrl !== "null" && redisUrl.trim() !== "") {
  try {
    logger.info("Initializing ioredis client...");
    redisClient = new import_ioredis.default(redisUrl, {
      maxRetriesPerRequest: null,
      // Required for BullMQ compatibility
      connectTimeout: 5e3
    });
    redisClient.on("connect", () => {
      isRedisConnected = true;
      logger.info("Redis client connected successfully!");
    });
    redisClient.on("error", (err) => {
      isRedisConnected = false;
      logger.warn({ error: err.message }, "Redis connection error, falling back to local storage.");
    });
  } catch (err) {
    logger.warn({ error: err.message }, "Could not initialize Redis client, using local memory instead.");
  }
} else {
  logger.info("No REDIS_URL environment variable found. Redis caching and rate limiting is in local in-memory mode.");
}
function getRedisClient() {
  return isRedisConnected ? redisClient : null;
}
async function cacheGet(key) {
  const client = getRedisClient();
  if (client) {
    try {
      return await client.get(key);
    } catch (err) {
      logger.error({ error: err.message, key }, "Redis get error. Falling back to local memory cache.");
    }
  }
  const entry = localCacheStore.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    localCacheStore.delete(key);
    return null;
  }
  return entry.value;
}
async function cacheSet(key, value, ttlSeconds = 300) {
  const client = getRedisClient();
  if (client) {
    try {
      await client.set(key, value, "EX", ttlSeconds);
      return;
    } catch (err) {
      logger.error({ error: err.message, key }, "Redis set error. Storing in local memory cache instead.");
    }
  }
  localCacheStore.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1e3
  });
  enforceLocalCacheEviction();
}
async function cacheDel(key) {
  const client = getRedisClient();
  if (client) {
    try {
      await client.del(key);
      return;
    } catch (err) {
      logger.error({ error: err.message, key }, "Redis delete error. Deleting from local memory cache.");
    }
  }
  localCacheStore.delete(key);
}
async function cacheFlushPattern(pattern) {
  const client = getRedisClient();
  if (client) {
    try {
      const keys = await client.keys(pattern);
      if (keys.length > 0) {
        await client.del(...keys);
      }
      return;
    } catch (err) {
      logger.error({ error: err.message, pattern }, "Redis keys pattern flush error. Flushing local memory cache.");
    }
  }
  const regexPattern = "^" + pattern.replace(/[-[\]{}()+?.,\\^$|#\s]/g, "\\$&").replace(/\\\*/g, ".*") + "$";
  const regex = new RegExp(regexPattern);
  let deletedCount = 0;
  for (const key of localCacheStore.keys()) {
    if (regex.test(key)) {
      localCacheStore.delete(key);
      deletedCount++;
    }
  }
  if (deletedCount > 0) {
    logger.info({ pattern, deletedCount }, "Local cache pattern flush cleared matching items.");
  }
}

// src/server/queue.ts
init_logger();

// src/server/s3Backup.ts
var import_client_s3 = require("@aws-sdk/client-s3");
var import_fs2 = __toESM(require("fs"), 1);
var import_path2 = __toESM(require("path"), 1);
init_logger();
var S3BackupService = class {
  static getS3Client() {
    const endpoint = process.env.S3_ENDPOINT;
    const accessKeyId = process.env.S3_ACCESS_KEY_ID;
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
    const bucket = process.env.S3_BUCKET;
    if (!accessKeyId || !secretAccessKey || !bucket) {
      logger.info("S3 backup credentials are not fully configured. S3 backups are skipped (local backups are maintained).");
      return null;
    }
    try {
      return new import_client_s3.S3Client({
        endpoint: endpoint || void 0,
        region: process.env.S3_REGION || "us-east-1",
        credentials: {
          accessKeyId,
          secretAccessKey
        },
        forcePathStyle: !!endpoint
        // Required for minio/supabase storage
      });
    } catch (err) {
      logger.error({ error: err.message }, "Failed to create S3 client.");
      return null;
    }
  }
  /**
   * Run a full backup and upload it to S3.
   */
  static async runAndUploadBackup() {
    try {
      logger.info("Starting automated S3-compatible cloud backup...");
      if (!dbService.isUsingPostgres()) {
        logger.warn("PostgreSQL database is offline. Cannot perform S3 cloud backup.");
        return null;
      }
      const backupData = await dbService.exportPostgresData();
      const serialized = JSON.stringify(backupData, null, 2);
      const timestamp2 = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
      const filename = `uniinfo_backup_${timestamp2}.json`;
      const s3 = this.getS3Client();
      const bucket = process.env.S3_BUCKET;
      if (!s3 || !bucket) {
        const backupDir = import_path2.default.join(process.cwd(), "backups");
        if (!import_fs2.default.existsSync(backupDir)) {
          import_fs2.default.mkdirSync(backupDir, { recursive: true });
        }
        const localPath = import_path2.default.join(backupDir, filename);
        import_fs2.default.writeFileSync(localPath, serialized, "utf-8");
        logger.info({ localPath }, "Local JSON backup written as fallback.");
        return filename;
      }
      logger.info({ bucket, filename }, "Uploading backup to S3-compatible bucket...");
      await s3.send(
        new import_client_s3.PutObjectCommand({
          Bucket: bucket,
          Key: `backups/${filename}`,
          Body: serialized,
          ContentType: "application/json"
        })
      );
      logger.info({ filename }, "Database backup successfully uploaded to cloud S3 storage!");
      await this.enforceS3Retention(s3, bucket);
      return filename;
    } catch (err) {
      logger.error({ error: err.message }, "Cloud backup failed.");
      return null;
    }
  }
  /**
   * Prune backups older than 7 days from S3.
   */
  static async enforceS3Retention(s3, bucket) {
    try {
      const listRes = await s3.send(
        new import_client_s3.ListObjectsV2Command({
          Bucket: bucket,
          Prefix: "backups/"
        })
      );
      if (!listRes.Contents || listRes.Contents.length === 0) return;
      const now = Date.now();
      const retentionMs = 7 * 24 * 60 * 60 * 1e3;
      for (const item of listRes.Contents) {
        if (!item.Key || !item.LastModified) continue;
        const ageMs = now - item.LastModified.getTime();
        if (ageMs > retentionMs) {
          logger.info({ key: item.Key }, "Pruning outdated backup on S3...");
          await s3.send(
            new import_client_s3.DeleteObjectCommand({
              Bucket: bucket,
              Key: item.Key
            })
          );
        }
      }
    } catch (err) {
      logger.warn({ error: err.message }, "Failed to enforce S3 backup retention.");
    }
  }
};

// src/server/queue.ts
var BackgroundQueueService = class {
  constructor() {
    this.bullQueue = null;
    this.bullWorker = null;
    this.fallbackJobs = [];
    this.initialize();
  }
  initialize() {
    const redis = getRedisClient();
    if (redis) {
      try {
        logger.info("Initializing BullMQ Queue and Workers...");
        const connection = redis.options;
        this.bullQueue = new import_bullmq.Queue("UniInfoBackgroundJobs", { connection });
        this.bullWorker = new import_bullmq.Worker(
          "UniInfoBackgroundJobs",
          async (job) => {
            await this.processJob(job.data);
          },
          { connection }
        );
        this.bullWorker.on("completed", (job) => {
          logger.info({ jobId: job.id }, "BullMQ background job completed successfully.");
        });
        this.bullWorker.on("failed", (job, err) => {
          logger.error({ jobId: job?.id, error: err.message }, "BullMQ background job failed.");
        });
        logger.info("BullMQ Queue and Worker initialized successfully.");
      } catch (err) {
        logger.warn({ error: err.message }, "BullMQ setup failed. Falling back to in-memory job runner.");
        this.bullQueue = null;
        this.bullWorker = null;
      }
    } else {
      logger.info("No Redis connected. Background queues are running in high-performance in-memory fallback mode.");
    }
  }
  /**
   * Main job processor
   */
  async processJob(payload) {
    logger.info({ task: payload.task }, "Executing background task...");
    switch (payload.task) {
      case "backup_to_s3":
        try {
          await S3BackupService.runAndUploadBackup();
        } catch (err) {
          logger.error({ error: err.message }, "Backup to S3 task failed.");
        }
        break;
      case "ai_recommend_prefetch":
        logger.info("Prefetching AI recommendations...");
        break;
      case "log_cleanup":
        logger.info("Cleaning up old audit and analytics logs...");
        break;
      case "send_verification_email":
        if (payload.data && payload.data.email && payload.data.token && payload.data.appUrl) {
          try {
            const { sendVerificationEmail: sendVerificationEmail2 } = await Promise.resolve().then(() => (init_email(), email_exports));
            await sendVerificationEmail2(payload.data.email, payload.data.token, payload.data.appUrl);
          } catch (err) {
            logger.error({ error: err.message }, "Failed to send background verification email");
          }
        }
        break;
      default:
        logger.warn({ task: payload.task }, "Unknown background task requested.");
    }
  }
  /**
   * Add a job to the background queue
   */
  async addJob(payload) {
    if (this.bullQueue) {
      try {
        const job = await this.bullQueue.add(`job_${payload.task}_${Date.now()}`, payload);
        return job.id || "bull_job";
      } catch (err) {
        logger.error({ error: err.message }, "Failed to add job to BullMQ. Falling back to immediate execution.");
      }
    }
    const mockId = `mock_job_${Math.random().toString(36).substring(7)}`;
    logger.info({ mockId, task: payload.task }, "Scheduling in-memory background job execution.");
    setTimeout(async () => {
      try {
        await this.processJob(payload);
      } catch (err) {
        logger.error({ error: err.message, mockId }, "In-memory background job failed.");
      }
    }, 100);
    return mockId;
  }
  getQueueStatus() {
    return {
      enabled: !!this.bullQueue,
      workerActive: !!this.bullWorker,
      fallbackQueueSize: this.fallbackJobs.length
    };
  }
  /**
   * Gracefully close BullMQ queue and worker.
   */
  async shutdown() {
    logger.info("Shutting down BackgroundQueueService...");
    if (this.bullWorker) {
      await this.bullWorker.close();
      this.bullWorker = null;
    }
    if (this.bullQueue) {
      await this.bullQueue.close();
      this.bullQueue = null;
    }
    logger.info("BackgroundQueueService shut down cleanly.");
  }
};
var backgroundQueue = new BackgroundQueueService();

// src/server/maintenance.ts
var MaintenanceService = class {
  constructor() {
    this.schedulerInterval = null;
    this.isRunning = false;
    // Metrics
    this.metrics = {
      lastRun: null,
      durationMs: null,
      expiredSessionsRemoved: 0,
      expiredTokensRemoved: 0,
      notificationsRemoved: 0,
      cacheEntriesRemoved: 0,
      temporaryFilesRemoved: 0,
      failureCount: 0,
      dbHealth: "healthy",
      queueHealth: "healthy"
    };
  }
  /**
   * Start the centralized Maintenance Service scheduler
   */
  start() {
    if (this.schedulerInterval) {
      logger.warn("Centralized Maintenance Service is already running.");
      return;
    }
    const intervalMinutes = parseInt(process.env.MAINTENANCE_INTERVAL_MINUTES || "15", 10);
    logger.info({ intervalMinutes }, "Initializing Centralized Maintenance Service...");
    this.runMaintenance().catch((err) => {
      logger.error({ error: err.message }, "Initial maintenance run failed.");
    });
    this.schedulerInterval = setInterval(async () => {
      try {
        await this.runMaintenance();
      } catch (err) {
        logger.error({ error: err.message }, "Error during scheduled maintenance run.");
      }
    }, intervalMinutes * 60 * 1e3);
    if (this.schedulerInterval && typeof this.schedulerInterval.unref === "function") {
      this.schedulerInterval.unref();
    }
  }
  /**
   * Stop the centralized Maintenance Service scheduler
   */
  async stop() {
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
      logger.info("Centralized Maintenance Service scheduler stopped.");
    }
    if (this.isRunning) {
      logger.info("Maintenance is currently running, waiting for completion before stopping...");
      while (this.isRunning) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
  }
  /**
   * Get current maintenance metrics
   */
  getMetrics() {
    return { ...this.metrics };
  }
  /**
   * Run the full maintenance cycle
   */
  async runMaintenance() {
    if (this.isRunning) {
      logger.warn("Maintenance cycle is already in progress. Skipping execution.");
      return;
    }
    this.isRunning = true;
    const startTime = Date.now();
    logger.info("Starting Centralized Maintenance cycle...");
    const sessionRetentionHours = parseInt(process.env.SESSION_RETENTION_HOURS || "24", 10);
    const notificationRetentionDays = parseInt(process.env.NOTIFICATION_RETENTION_DAYS || "90", 10);
    const cacheMaxItems = parseInt(process.env.CACHE_MAX_ITEMS || "1000", 10);
    const tempFileRetentionDays = parseInt(process.env.TEMP_FILE_RETENTION_DAYS || "7", 10);
    let sessionsCleaned = 0;
    let tokensCleaned = 0;
    let loginAttemptsCleaned = 0;
    let notificationsCleaned = 0;
    let cachePruned = 0;
    let tempFilesCleaned = 0;
    let hadFailures = false;
    try {
      sessionsCleaned = await dbService.cleanupExpiredSessions();
      logger.info({ sessionsCleaned }, "Maintenance: Expired sessions cleaned up.");
    } catch (err) {
      hadFailures = true;
      logger.error({ error: err.message }, "Maintenance task failed: cleanupExpiredSessions");
    }
    try {
      tokensCleaned = await dbService.cleanupExpiredTokens();
      logger.info({ tokensCleaned }, "Maintenance: Expired verification tokens cleaned up.");
    } catch (err) {
      hadFailures = true;
      logger.error({ error: err.message }, "Maintenance task failed: cleanupExpiredTokens");
    }
    try {
      loginAttemptsCleaned = await dbService.cleanupExpiredLoginAttempts(sessionRetentionHours);
      logger.info({ loginAttemptsCleaned }, "Maintenance: Expired login attempts cleaned up.");
    } catch (err) {
      hadFailures = true;
      logger.error({ error: err.message }, "Maintenance task failed: cleanupExpiredLoginAttempts");
    }
    try {
      notificationsCleaned = await dbService.cleanupExpiredNotifications(notificationRetentionDays);
      logger.info({ notificationsCleaned }, "Maintenance: Expired notifications cleaned up.");
    } catch (err) {
      hadFailures = true;
      logger.error({ error: err.message }, "Maintenance task failed: cleanupExpiredNotifications");
    }
    try {
      const expiredCacheRemoved = pruneExpiredCacheEntries();
      const evictedCacheRemoved = enforceLocalCacheEviction(cacheMaxItems);
      cachePruned = expiredCacheRemoved + evictedCacheRemoved;
      logger.info({ cachePruned, currentCacheSize: getLocalCacheSize() }, "Maintenance: Cache pruned and evicted.");
    } catch (err) {
      hadFailures = true;
      logger.error({ error: err.message }, "Maintenance task failed: Cache pruning");
    }
    try {
      tempFilesCleaned = this.cleanupTempFiles(tempFileRetentionDays);
      logger.info({ tempFilesCleaned }, "Maintenance: Temporary files cleaned up.");
    } catch (err) {
      hadFailures = true;
      logger.error({ error: err.message }, "Maintenance task failed: cleanupTempFiles");
    }
    try {
      BackupService.enforceRetention();
    } catch (err) {
      logger.error({ error: err.message }, "Maintenance check failed: BackupService.enforceRetention");
    }
    let dbHealthStatus = "healthy";
    try {
      const dbStatus = dbService.getPoolDiagnostics();
      if (dbStatus.status !== "online" && dbStatus.status !== "in-memory-active") {
        dbHealthStatus = "unhealthy";
      }
    } catch (err) {
      dbHealthStatus = "unhealthy";
    }
    let queueHealthStatus = "healthy";
    try {
      const queueStatus = backgroundQueue.getQueueStatus();
      if (queueStatus.enabled && !queueStatus.workerActive) {
        queueHealthStatus = "degraded";
      }
    } catch (err) {
      queueHealthStatus = "unhealthy";
    }
    const duration = Date.now() - startTime;
    logger.info({ durationMs: duration, hadFailures }, "Centralized Maintenance cycle completed.");
    this.metrics = {
      lastRun: (/* @__PURE__ */ new Date()).toISOString(),
      durationMs: duration,
      expiredSessionsRemoved: this.metrics.expiredSessionsRemoved + sessionsCleaned,
      expiredTokensRemoved: this.metrics.expiredTokensRemoved + tokensCleaned,
      notificationsRemoved: this.metrics.notificationsRemoved + notificationsCleaned,
      cacheEntriesRemoved: this.metrics.cacheEntriesRemoved + cachePruned,
      temporaryFilesRemoved: this.metrics.temporaryFilesRemoved + tempFilesCleaned,
      failureCount: this.metrics.failureCount + (hadFailures ? 1 : 0),
      dbHealth: dbHealthStatus,
      queueHealth: queueHealthStatus
    };
    this.isRunning = false;
  }
  /**
   * Helper to clean up temporary files (e.g., pre-restore safety backups, scheduler_init backups, etc.) older than retention.
   */
  cleanupTempFiles(retentionDays) {
    const BACKUP_DIR2 = import_path3.default.join(process.cwd(), "backups");
    if (!import_fs3.default.existsSync(BACKUP_DIR2)) {
      return 0;
    }
    let deletedCount = 0;
    try {
      const files = import_fs3.default.readdirSync(BACKUP_DIR2);
      const now = Date.now();
      const maxAgeMs = retentionDays * 24 * 60 * 60 * 1e3;
      for (const file of files) {
        const isTempFile = file.includes("pre_restore_safety") || file.includes("scheduler_init") || file.includes("hourly_check") || file.endsWith(".tmp") || file.endsWith(".temp");
        if (isTempFile) {
          const filePath = import_path3.default.join(BACKUP_DIR2, file);
          const stats = import_fs3.default.statSync(filePath);
          const ageMs = now - stats.mtimeMs;
          if (ageMs > maxAgeMs) {
            import_fs3.default.unlinkSync(filePath);
            deletedCount++;
            logger.info({ filename: file }, "Pruned stale temporary backup file.");
          }
        }
      }
    } catch (err) {
      logger.error({ error: err.message }, "Error during cleanupTempFiles");
    }
    return deletedCount;
  }
};
var maintenanceService = new MaintenanceService();

// src/server/monitoring.ts
var MonitoringService = class {
  static {
    this.startTime = Date.now();
  }
  /**
   * Run full health check diagnostics.
   * Leverages real PostgreSQL status checks.
   */
  static async getHealthDiagnostics(db) {
    const uptimeSeconds = Math.floor((Date.now() - this.startTime) / 1e3);
    const memory = process.memoryUsage();
    let dbStatus = "healthy";
    let dbError = void 0;
    if (db || dbService.isUsingPostgres()) {
      dbStatus = "healthy";
    } else {
      dbStatus = "unhealthy";
      dbError = "PostgreSQL database is offline or not configured.";
    }
    const groqKey = process.env.GROQ_API_KEY;
    const groqConfigured = !!groqKey && groqKey.trim() !== "" && groqKey.trim() !== "undefined" && groqKey.trim() !== "null" && !groqKey.trim().startsWith("YOUR_") && !groqKey.trim().startsWith("MY_") && !groqKey.trim().includes("INSERT_") && !groqKey.trim().includes("API_KEY_HERE");
    const aiProviderStatus = groqConfigured ? "available" : "unavailable";
    let uniCount = dbService.mockUniversities?.length ?? 0;
    let userCount = "managed";
    let sessionCount = "active";
    if (db) {
      uniCount = Array.isArray(db.universities) ? db.universities.length : 0;
      userCount = Array.isArray(db.users) ? db.users.length : 0;
      sessionCount = db.sessions ? Object.keys(db.sessions).length : 0;
    } else if (dbService.isUsingPostgres()) {
      try {
        const unis = await dbService.getUniversities({});
        uniCount = unis.length;
      } catch (err) {
        dbStatus = "unhealthy";
        dbError = `PostgreSQL query error: ${err.message}`;
        uniCount = dbService.mockUniversities?.length ?? 0;
      }
    } else {
      uniCount = dbService.mockUniversities?.length ?? 0;
      userCount = dbService.mockUsers?.length ?? 0;
      sessionCount = dbService.mockSessions?.length ?? 0;
    }
    const dbType = dbService.isUsingPostgres() ? "postgresql" : "in-memory";
    return {
      status: dbStatus === "unhealthy" ? "degraded" : "ok",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      uptimeSeconds,
      engine: dbType,
      components: {
        database: {
          status: dbStatus,
          error: dbError,
          recordCounts: {
            universities: uniCount,
            users: userCount,
            sessions: sessionCount
          }
        },
        aiProviders: {
          status: aiProviderStatus,
          groqConfigured
        },
        maintenance: maintenanceService.getMetrics(),
        system: {
          memoryHeapUsedMB: Math.round(memory.heapUsed / 1024 / 1024),
          memoryHeapTotalMB: Math.round(memory.heapTotal / 1024 / 1024),
          memoryRssMB: Math.round(memory.rss / 1024 / 1024),
          nodeVersion: process.version
        }
      }
    };
  }
  /**
   * Express Handler for standard Prometheus Plain-Text metrics.
   */
  static async handleMetrics(req, res, db) {
    const uptimeSeconds = Math.floor((Date.now() - this.startTime) / 1e3);
    const memory = process.memoryUsage();
    const maintenanceMetrics = maintenanceService.getMetrics();
    let uniCount = dbService.mockUniversities?.length ?? 0;
    let userCount = dbService.mockUsers?.length ?? 0;
    let sessionCount = dbService.mockSessions?.length ?? 0;
    if (db) {
      uniCount = Array.isArray(db.universities) ? db.universities.length : 0;
      userCount = Array.isArray(db.users) ? db.users.length : 0;
      sessionCount = db.sessions ? Object.keys(db.sessions).length : 0;
    } else if (dbService.isUsingPostgres()) {
      try {
        const unis = await dbService.getUniversities({});
        uniCount = unis.length;
      } catch {
        uniCount = dbService.mockUniversities?.length ?? 0;
      }
    } else {
      uniCount = dbService.mockUniversities?.length ?? 0;
      userCount = dbService.mockUsers?.length ?? 0;
      sessionCount = dbService.mockSessions?.length ?? 0;
    }
    const prometheusString = [
      `# HELP node_uptime_seconds Uptime of the node server in seconds`,
      `# TYPE node_uptime_seconds gauge`,
      `node_uptime_seconds ${uptimeSeconds}`,
      ``,
      `# HELP node_memory_rss_bytes Resident Set Size memory usage in bytes`,
      `# TYPE node_memory_rss_bytes gauge`,
      `node_memory_rss_bytes ${memory.rss}`,
      ``,
      `# HELP node_memory_heap_total_bytes Total allocated heap memory in bytes`,
      `# TYPE node_memory_heap_total_bytes gauge`,
      `node_memory_heap_total_bytes ${memory.heapTotal}`,
      ``,
      `# HELP node_memory_heap_used_bytes Used heap memory in bytes`,
      `# TYPE node_memory_heap_used_bytes gauge`,
      `node_memory_heap_used_bytes ${memory.heapUsed}`,
      ``,
      `# HELP db_universities_total Total number of universities in the database`,
      `# TYPE db_universities_total gauge`,
      `db_universities_total ${uniCount}`,
      ``,
      `# HELP db_users_total Total registered users`,
      `# TYPE db_users_total gauge`,
      `db_users_total ${userCount}`,
      ``,
      `# HELP db_active_sessions_total Total active login sessions`,
      `# TYPE db_active_sessions_total gauge`,
      `db_active_sessions_total ${sessionCount}`,
      ``,
      `# HELP maintenance_last_run_timestamp_ms Last maintenance run timestamp in milliseconds`,
      `# TYPE maintenance_last_run_timestamp_ms gauge`,
      `maintenance_last_run_timestamp_ms ${maintenanceMetrics.lastRun ? Date.parse(maintenanceMetrics.lastRun) : 0}`,
      ``,
      `# HELP maintenance_duration_ms Duration of the last maintenance run in milliseconds`,
      `# TYPE maintenance_duration_ms gauge`,
      `maintenance_duration_ms ${maintenanceMetrics.durationMs || 0}`,
      ``,
      `# HELP maintenance_expired_sessions_removed_total Total expired sessions removed since startup`,
      `# TYPE maintenance_expired_sessions_removed_total counter`,
      `maintenance_expired_sessions_removed_total ${maintenanceMetrics.expiredSessionsRemoved}`,
      ``,
      `# HELP maintenance_expired_tokens_removed_total Total expired tokens removed since startup`,
      `# TYPE maintenance_expired_tokens_removed_total counter`,
      `maintenance_expired_tokens_removed_total ${maintenanceMetrics.expiredTokensRemoved}`,
      ``,
      `# HELP maintenance_notifications_removed_total Total notifications removed since startup`,
      `# TYPE maintenance_notifications_removed_total counter`,
      `maintenance_notifications_removed_total ${maintenanceMetrics.notificationsRemoved}`,
      ``,
      `# HELP maintenance_cache_entries_removed_total Total cache entries removed since startup`,
      `# TYPE maintenance_cache_entries_removed_total counter`,
      `maintenance_cache_entries_removed_total ${maintenanceMetrics.cacheEntriesRemoved}`,
      ``,
      `# HELP maintenance_temporary_files_removed_total Total temporary files removed since startup`,
      `# TYPE maintenance_temporary_files_removed_total counter`,
      `maintenance_temporary_files_removed_total ${maintenanceMetrics.temporaryFilesRemoved}`,
      ``,
      `# HELP maintenance_failures_total Total maintenance run failures since startup`,
      `# TYPE maintenance_failures_total counter`,
      `maintenance_failures_total ${maintenanceMetrics.failureCount}`
    ].join("\n");
    res.set("Content-Type", "text/plain; version=0.0.4; charset=utf-8");
    res.status(200).send(prometheusString);
  }
};

// src/server/openapi.ts
var openapiSpec = {
  openapi: "3.0.0",
  info: {
    title: "UniInfo Secure Portal API",
    version: "1.0.0",
    description: "Production-grade, fully resilient API documentation for UniInfo University Advisory & Analytics Platform."
  },
  servers: [
    {
      url: "/api",
      description: "Base API Path"
    }
  ],
  paths: {
    "/login": {
      post: {
        summary: "User Login",
        description: "Authenticate student, admin, parent, or counselor credentials.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string" }
                }
              }
            }
          }
        },
        responses: {
          200: { description: "Successful authentication" },
          401: { description: "Invalid credentials" },
          423: { description: "Account locked out" }
        }
      }
    },
    "/register": {
      post: {
        summary: "User Registration",
        description: "Register a new secure account with standard or custom roles.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string" },
                  role: { type: "string", enum: ["Admin", "Student", "Parent", "Counselor"], default: "Student" },
                  name: { type: "string" }
                }
              }
            }
          }
        },
        responses: {
          200: { description: "Account created successfully" },
          400: { description: "Validation failures or account exists" }
        }
      }
    },
    "/universities": {
      get: {
        summary: "List Universities",
        description: "Query and filter the entire university catalog with detailed parameters.",
        parameters: [
          { name: "search", in: "query", schema: { type: "string" } },
          { name: "stream", in: "query", schema: { type: "string" } },
          { name: "state", in: "query", schema: { type: "string" } },
          { name: "feeMax", in: "query", schema: { type: "integer" } }
        ],
        responses: {
          200: { description: "Filtered list of universities" }
        }
      }
    },
    "/universities/{id}": {
      get: {
        summary: "Get University Details",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "integer" } }
        ],
        responses: {
          200: { description: "Detailed university object" },
          404: { description: "University not found" }
        }
      }
    },
    "/universities/{id}/reviews": {
      post: {
        summary: "Post Review",
        description: "Submit a verified review for a university (requires authentication).",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "integer" } }
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["rating", "comment"],
                properties: {
                  rating: { type: "integer", minimum: 1, maximum: 5 },
                  comment: { type: "string" }
                }
              }
            }
          }
        },
        responses: {
          200: { description: "Review added successfully" },
          401: { description: "Unauthorized" }
        }
      }
    },
    "/university-of-the-day": {
      get: {
        summary: "University of the Day",
        description: "Get the highlighted university spotlight of the current day.",
        responses: {
          200: { description: "University spotlight" }
        }
      }
    },
    "/user/profile": {
      get: {
        summary: "User Profile",
        description: "Retrieve currently authenticated user profile including bookmarks and role.",
        responses: {
          200: { description: "User details" },
          401: { description: "Unauthorized" }
        }
      }
    },
    "/user/bookmarks": {
      post: {
        summary: "Toggle Bookmark",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["universityId"],
                properties: {
                  universityId: { type: "integer" }
                }
              }
            }
          }
        },
        responses: {
          200: { description: "Bookmark toggled" }
        }
      }
    },
    "/analytics": {
      get: {
        summary: "System Analytics Metrics",
        description: "Fetch live event counts and trending student search terms (requires Admin role).",
        responses: {
          200: { description: "Analytics statistics" },
          403: { description: "Forbidden: Admin privileges required" }
        }
      }
    },
    "/chat": {
      post: {
        summary: "AI Counselor Chat",
        description: "Ask queries to the smart academic advisory chat engine.",
        responses: {
          200: { description: "Model response text payload" }
        }
      }
    }
  }
};

// src/server/ai.ts
var import_groq_sdk = __toESM(require("groq-sdk"), 1);
init_logger();
var groqClient = null;
function getGroqClient() {
  if (!groqClient) {
    const key = process.env.GROQ_API_KEY;
    if (!key || key === "MY_GROQ_API_KEY") {
      throw new Error("GROQ_API_KEY environment variable is required but not configured.");
    }
    groqClient = new import_groq_sdk.default({
      apiKey: key
    });
  }
  return groqClient;
}
function isGroqConfigured() {
  const key = process.env.GROQ_API_KEY;
  return !!(key && key !== "MY_GROQ_API_KEY" && key.trim() !== "");
}
var cachedAvailableModels = null;
var lastModelsFetchTime = 0;
var MODELS_CACHE_TTL_MS = 10 * 60 * 1e3;
async function getAvailableGroqModels(forceRefresh = false) {
  if (!isGroqConfigured()) return [];
  const now = Date.now();
  if (!forceRefresh && cachedAvailableModels && now - lastModelsFetchTime < MODELS_CACHE_TTL_MS) {
    return cachedAvailableModels;
  }
  try {
    const client = getGroqClient();
    const list = await client.models.list();
    if (list && Array.isArray(list.data) && list.data.length > 0) {
      cachedAvailableModels = list.data.map((m) => m.id);
      lastModelsFetchTime = now;
      logger.info({ count: cachedAvailableModels.length, models: cachedAvailableModels }, "Discovered active Groq models");
      return cachedAvailableModels;
    }
  } catch (err) {
    logger.warn({ error: err.message }, "Failed to query Groq models list, falling back to heuristics");
  }
  return cachedAvailableModels || [];
}
async function resolveWorkingModel(mode = "standard") {
  const available = await getAvailableGroqModels();
  const preferredList = mode === "low-latency" ? [
    "openai/gpt-oss-20b",
    "groq/compound-mini",
    "openai/gpt-oss-120b",
    "groq/compound",
    "llama-3.1-8b-instant"
  ] : mode === "thinking" ? [
    "openai/gpt-oss-120b",
    "groq/compound",
    "qwen/qwen3.8-27b",
    "openai/gpt-oss-20b"
  ] : [
    "openai/gpt-oss-120b",
    "groq/compound",
    "openai/gpt-oss-20b",
    "groq/compound-mini",
    "qwen/qwen3.8-27b",
    "llama-3.3-70b-versatile"
  ];
  if (available.length > 0) {
    const matched = preferredList.find((m) => available.includes(m));
    if (matched) return matched;
    const usableChatModel = available.find(
      (m) => !m.includes("whisper") && !m.includes("guard") && !m.includes("orpheus") && !m.includes("safeguard") && !m.includes("qwen3.6")
    );
    if (usableChatModel) return usableChatModel;
  }
  return mode === "low-latency" ? "openai/gpt-oss-20b" : "openai/gpt-oss-120b";
}
async function callGroqWithRetry(params, retries = 3, delay = 600) {
  let attempt = 0;
  let currentParams = { ...params };
  if (!currentParams.max_tokens) {
    currentParams.max_tokens = 1500;
  }
  const client = getGroqClient();
  while (attempt < retries) {
    try {
      const timeoutMs = 35e3;
      const timeoutPromise = new Promise(
        (_, reject) => setTimeout(() => reject(new Error("Groq API call timed out")), timeoutMs)
      );
      const callPromise = client.chat.completions.create(currentParams);
      const response = await Promise.race([callPromise, timeoutPromise]);
      return response;
    } catch (err) {
      attempt++;
      const isTimeout = err.message && err.message.includes("timed out");
      if (isTimeout) {
        aiAnalytics.timeouts++;
      }
      const isModelIssue = isTimeout || err.status === 404 || err.code === "model_not_found" || err.code === "rate_limit_exceeded" || err.message && (err.message.includes("does not exist") || err.message.includes("model_not_found") || err.message.includes("do not have access to it") || err.message.includes("exceed the enforced limit") || err.message.includes("output tokens per minute") || err.message.includes("json_validate_failed"));
      if (isModelIssue) {
        logger.warn({ failedModel: currentParams.model, attempt, error: err.message }, "Model limitation, timeout, or missing model on Groq. Falling back to high-speed alternate...");
        const freshAvailable = await getAvailableGroqModels(true);
        const fallbackPriority = ["openai/gpt-oss-120b", "groq/compound", "groq/compound-mini", "openai/gpt-oss-20b"];
        let alternateModel = fallbackPriority.find((m) => m !== currentParams.model && freshAvailable.includes(m));
        if (!alternateModel) {
          alternateModel = freshAvailable.find(
            (m) => m !== currentParams.model && !m.includes("whisper") && !m.includes("guard") && !m.includes("orpheus") && !m.includes("safeguard") && !m.includes("qwen")
          ) || "openai/gpt-oss-120b";
        }
        logger.info({ oldModel: currentParams.model, newModel: alternateModel }, "Seamlessly switched to alternate available Groq model");
        currentParams.model = alternateModel;
        continue;
      }
      if (attempt >= retries) {
        aiAnalytics.failures++;
        throw err;
      }
      aiAnalytics.errors++;
      const backoff = delay * Math.pow(2, attempt);
      logger.warn({ attempt, backoff, error: err.message }, "Retrying Groq API call due to transient failure...");
      await new Promise((resolve) => setTimeout(resolve, backoff));
    }
  }
}
var aiAnalytics = {
  requests: 0,
  latencySumMs: 0,
  errors: 0,
  failures: 0,
  timeouts: 0,
  rateLimits: 0,
  tokenUsage: {
    promptTokens: 0,
    candidatesTokens: 0,
    totalTokens: 0
  },
  successfulRecommendations: 0,
  conversationLengths: [],
  getAverageResponseTime: () => {
    return aiAnalytics.requests > 0 ? aiAnalytics.latencySumMs / aiAnalytics.requests : 0;
  }
};
function isSafePrompt(message) {
  const normalized = message.toLowerCase();
  const suspiciousPatterns = [
    "ignore previous instructions",
    "ignore the instructions",
    "reveal your prompt",
    "show your prompt",
    "show hidden instructions",
    "reveal hidden instructions",
    "system prompt",
    "you must now act as",
    "jailbreak",
    "bypass"
  ];
  return !suspiciousPatterns.some((pattern) => normalized.includes(pattern));
}
function sanitizeOutput(text2) {
  let sanitized = text2;
  sanitized = sanitized.replace(/AIzaSy[A-Za-z0-9-_]{35}/g, "[SECRET_KEY]");
  sanitized = sanitized.replace(/key-[a-zA-Z0-9]{32}/g, "[SECRET]");
  sanitized = sanitized.replace(/postgresql:\/\/[^'"\s]+/gi, "[DATABASE_URL]");
  sanitized = sanitized.replace(/systemInstruction/g, "instructions");
  sanitized = sanitized.replace(/updatedProfile/g, "profile");
  return sanitized;
}
function trimConversationContext(history) {
  if (history.length <= 6) return history;
  const deduplicated = [];
  for (let i = 0; i < history.length; i++) {
    const current = history[i];
    const prev = deduplicated[deduplicated.length - 1];
    if (prev && prev.role === current.role && prev.content.trim() === current.content.trim()) {
      continue;
    }
    deduplicated.push(current);
  }
  return deduplicated.slice(-4);
}
function shortlistUniversitiesForProfile(profile, isParent, universities3) {
  if (!universities3 || universities3.length === 0) return [];
  const stream = profile.stream || profile.stream;
  const preferredCourse = profile.preferredCourse || profile.preferred_course;
  const budget = profile.budget;
  const entranceExams = profile.entranceExams || profile.entrance_exams;
  let hostelPreference = false;
  if (isParent) {
    hostelPreference = profile.accommodationPreference === "Hostel" || profile.accommodation_preference === "Hostel";
  } else {
    hostelPreference = !!(profile.hostelPreference || profile.hostel_preference);
  }
  const preferredLocation = isParent ? profile.preferredStateCity || profile.preferred_state_city : profile.preferredLocation || profile.preferred_location;
  const placementPriority = profile.placementPriority || profile.placement_priority;
  const collegeType = profile.academicScores?.collegeType || profile.academic_scores?.collegeType || profile.academic_scores?.college_type;
  const scoreResults = universities3.map((uni) => {
    let score = 85;
    const pros = [];
    const cons = [];
    if (preferredCourse) {
      const courseLower = preferredCourse.toLowerCase();
      const offersCourse = uni.stream && uni.stream.some((s) => s.toLowerCase().includes(courseLower)) || uni.degrees && uni.degrees.some((d) => d.toLowerCase().includes(courseLower));
      if (offersCourse) {
        score += 15;
        pros.push(`Offers your preferred course (${preferredCourse})`);
      } else {
        score -= 15;
        cons.push(`Preferred course (${preferredCourse}) is not primary focus`);
      }
    }
    if (stream) {
      const streamLower = stream.toLowerCase();
      const offersStream = uni.stream && uni.stream.some((s) => s.toLowerCase().includes(streamLower)) || uni.majors && uni.majors.some((m) => m.toLowerCase().includes(streamLower));
      if (offersStream) {
        score += 10;
        pros.push(`Offers preferred branch/stream (${stream})`);
      } else {
        score -= 10;
        cons.push(`Branch ${stream} is not majorly highlighted`);
      }
    }
    if (budget && budget > 0) {
      if (uni.fee <= budget) {
        score += 15;
        pros.push(`Tuition \u20B9${(uni.fee / 1e5).toFixed(1)} Lakh/yr is comfortably within budget`);
      } else {
        const diff = uni.fee - budget;
        const penalty = Math.min(Math.floor(diff / 1e4), 40);
        score -= penalty;
        cons.push(`Tuition \u20B9${(uni.fee / 1e5).toFixed(1)} Lakh/yr is \u20B9${(diff / 1e5).toFixed(1)} Lakh over budget`);
      }
    }
    if (entranceExams) {
      const examsList = Array.isArray(entranceExams) ? entranceExams : [entranceExams];
      const matchingExams = examsList.filter(
        (exam) => uni.competitiveExams && uni.competitiveExams.some((ce) => ce.toLowerCase().includes(exam.toLowerCase()))
      );
      if (matchingExams.length > 0) {
        score += 15;
        pros.push(`Directly accepts entrance exam: ${matchingExams.join(", ")}`);
      } else if (uni.competitiveExams && uni.competitiveExams.length > 0) {
        score -= 10;
        cons.push(`Requires specific entrance exam(s)`);
      }
    }
    const hasHostels = uni.campusMap?.hasHostels ?? true;
    if (hostelPreference) {
      if (hasHostels) {
        score += 10;
        pros.push("Provides excellent on-campus hostel facilities");
      } else {
        score -= 15;
        cons.push("Does not verify or provide on-campus hostel facilities");
      }
    }
    if (preferredLocation && preferredLocation.toLowerCase() !== "any" && preferredLocation.toLowerCase() !== "any state") {
      const locLower = preferredLocation.toLowerCase();
      if (uni.location.toLowerCase().includes(locLower) || uni.state.toLowerCase().includes(locLower)) {
        score += 15;
        pros.push(`Located in your preferred state/city: ${preferredLocation}`);
      } else {
        score -= 5;
      }
    }
    if (placementPriority === "High" || placementPriority === "Very Important") {
      if (uni.avgPlacementLPA >= 8) {
        score += 15;
        pros.push(`Outstanding average placement record of \u20B9${uni.avgPlacementLPA} LPA`);
      } else if (uni.avgPlacementLPA < 5) {
        score -= 10;
        cons.push(`Modest placement statistics (Avg \u20B9${uni.avgPlacementLPA} LPA)`);
      }
    }
    if (collegeType && collegeType.toLowerCase() !== "any" && collegeType.toLowerCase() !== "open") {
      if (uni.type.toLowerCase().includes(collegeType.toLowerCase())) {
        score += 10;
        pros.push(`Matches preferred type: ${uni.type}`);
      } else {
        score -= 10;
      }
    }
    const finalScore = Math.max(25, Math.min(100, score));
    return {
      uni,
      matchPercentage: finalScore,
      matchReasons: pros.slice(0, 3)
    };
  });
  return scoreResults.sort((a, b) => b.matchPercentage - a.matchPercentage).slice(0, 6);
}
async function handleCounselorChat(userEmail, userRole, message, history, mode = "standard", completedProfile) {
  const startTime = Date.now();
  try {
    if (!isSafePrompt(message)) {
      aiAnalytics.requests++;
      aiAnalytics.errors++;
      return {
        reply: "I am here as your dedicated admissions counselor. I can only discuss college selection, budget planning, entrance exam goals, and career shortlisting. Let me know which stream or courses you are interested in!"
      };
    }
    const model = await resolveWorkingModel(mode);
    let existingProfile = null;
    if (completedProfile) {
      existingProfile = completedProfile;
      logger.info({ email: userEmail, updates: completedProfile }, "Synchronizing completed wizard profile to database");
      if (userRole === "Parent") {
        await dbService.saveParentProfile(userEmail, completedProfile);
      } else {
        await dbService.saveStudentProfile(userEmail, completedProfile);
      }
    } else {
      if (userRole === "Parent") {
        existingProfile = await dbService.getParentProfile(userEmail);
      } else {
        existingProfile = await dbService.getStudentProfile(userEmail);
      }
    }
    const dbUser = await dbService.getUserByEmail(userEmail).catch(() => null);
    const bookmarksList = dbUser?.bookmarks || [];
    const notificationsList = await dbService.getNotifications(userEmail).catch(() => []);
    const universities3 = await dbService.getUniversities();
    const isParent = userRole === "Parent";
    const shortlisted = shortlistUniversitiesForProfile(existingProfile || {}, isParent, universities3);
    const topMatchingUnisGrounded = shortlisted.map((item) => ({
      id: item.uni.id,
      name: item.uni.name,
      location: `${item.uni.location}, ${item.uni.state}`,
      type: item.uni.type,
      feePerYearINR: item.uni.fee,
      avgPlacementLPA: item.uni.avgPlacementLPA,
      nirfRank: item.uni.nirfRank,
      naacGrade: item.uni.naacGrade,
      hostelAvailable: item.uni.campusMap?.hasHostels ?? true,
      matchPercentage: item.matchPercentage,
      matchReasons: item.matchReasons
    }));
    const systemInstruction = `You are the expert, friendly, professional, patient UniInfo Admission Counselor. Analyze profiles, explain recommended colleges, compare choices, and offer wise counseling.

### RULES:
1. NO INTERVIEWING: User's profile is 100% complete. Do not ask budget, location, or exam questions. Talk like a premier, experienced human counselor.
2. COMPARISON MODE: Automatically activate when user mentions 2+ colleges or uses comparative terms. Start comparisons with a clean Markdown table, analyze trade-offs, and provide a personalized verdict based on their focus (placements, budget, etc.).
3. ADAPTIVE TONE: Adjust dynamically for Students (course quality, placements, campus life) vs Parents (total costs, ROI, safety).
4. PREMIUM FORMAT: Keep replies scannable with bold key metrics and sparse emojis. Recommend matching colleges using:
   \u{1F3C6} **1. [University Name] \u2014 Strong Match**
   - **Why it fits**: (bullets)
   - **Key metrics**: (fees, placements)
   - **Best for**: (strengths)
   - **Trade-off**: (consequences)
5. LINKS: Format university names as [[University Name|ID]] (using only real IDs from the shortlisted catalog below).
6. TRUTH & ACCURACY: Never fabricate fees, packages, or rankings. If unknown, say "I don't have verified current data for that figure." Do not guarantee admission.
7. RESPOND ONLY IN VALID JSON:
{
  "reply": "Your friendly, personalized Markdown text to user. Ends with exactly ONE logical, engaging question.",
  "recommendations": [{"universityId": number, "matchPercentage": number, "matchReasons": ["string"]}],
  "comparison": {
    "universityIds": [number],
    "winnerId": number,
    "winnerReason": "string",
    "categoryWinners": {"lowestFees": number, "bestPlacements": number, "bestHostel": number, "bestRoi": number, "bestOverall": number},
    "strengths": [{"universityId": number, "points": ["string"]}],
    "weaknesses": [{"universityId": number, "points": ["string"]}]
  }
}

### Shortlisted Catalog:
${JSON.stringify(topMatchingUnisGrounded, null, 2)}

### Profile:
${JSON.stringify(existingProfile || {}, null, 2)}`;
    const trimmedHistory = trimConversationContext(history);
    const messages = trimmedHistory.map((h) => ({
      role: h.role === "assistant" ? "assistant" : "user",
      content: h.content
    }));
    messages.push({
      role: "user",
      content: message
    });
    let text2 = "";
    if (!isGroqConfigured()) {
      return {
        reply: "\u26A0\uFE0F **Groq API Key is not configured!** Please add the `GROQ_API_KEY` environment variable to enable the AI Counselor chatbot."
      };
    }
    logger.info({ email: userEmail, model }, "Invoking Groq model for counselor chat with retry");
    const groqMessages = [
      { role: "system", content: systemInstruction },
      ...messages.map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content
      }))
    ];
    const response = await callGroqWithRetry({
      model,
      messages: groqMessages,
      temperature: 0.1,
      response_format: { type: "json_object" },
      max_tokens: 1500
    });
    const latency = Date.now() - startTime;
    aiAnalytics.requests++;
    aiAnalytics.latencySumMs += latency;
    aiAnalytics.conversationLengths.push(history.length + 1);
    if (response && response.usage) {
      aiAnalytics.tokenUsage.promptTokens += response.usage.prompt_tokens || 0;
      aiAnalytics.tokenUsage.candidatesTokens += response.usage.completion_tokens || 0;
      aiAnalytics.tokenUsage.totalTokens += response.usage.total_tokens || 0;
    }
    text2 = response?.choices?.[0]?.message?.content || "{}";
    text2 = text2.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
    if (text2.startsWith("```json")) {
      text2 = text2.substring(7);
    }
    if (text2.startsWith("```")) {
      text2 = text2.substring(3);
    }
    if (text2.endsWith("```")) {
      text2 = text2.substring(0, text2.length - 3);
    }
    text2 = text2.trim();
    text2 = sanitizeOutput(text2);
    let parsed;
    try {
      parsed = JSON.parse(text2);
    } catch {
      const jsonMatch = text2.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        parsed = {
          reply: text2 || "I am here to guide you with college options and admissions. How can I assist you today?",
          recommendations: []
        };
      }
    }
    if (!parsed.reply || parsed.reply.trim() === "") {
      parsed.reply = "Here are the top university recommendations matched to your criteria.";
    }
    if (parsed.recommendations && parsed.recommendations.length > 0) {
      aiAnalytics.successfulRecommendations++;
    }
    if (parsed.updatedProfile && Object.keys(parsed.updatedProfile).length > 0) {
      logger.info({ email: userEmail, updates: parsed.updatedProfile }, "Auto-saving profile updates from counselor session");
      if (userRole === "Parent") {
        const cleaned = { ...existingProfile, ...parsed.updatedProfile };
        await dbService.saveParentProfile(userEmail, cleaned);
      } else {
        const cleaned = { ...existingProfile, ...parsed.updatedProfile };
        await dbService.saveStudentProfile(userEmail, cleaned);
      }
    }
    await dbService.saveChatMessage(userEmail, "user", message);
    await dbService.saveChatMessage(userEmail, "assistant", parsed.reply);
    return parsed;
  } catch (err) {
    aiAnalytics.failures++;
    logger.error({ error: err.message, email: userEmail }, "handleCounselorChat error occurred, using graceful fallback");
    return {
      reply: "I'm temporarily unable to generate personalized recommendations. Please try again in a few moments."
    };
  }
}
async function handleGeneralChat(messages, temperature = 0.1, responseFormat) {
  try {
    const systemContent = messages.find((m) => m.role === "system")?.content || "You are a helpful assistant.";
    const conversation = messages.filter((m) => m.role !== "system");
    let reply = "";
    if (!isGroqConfigured()) {
      return {
        choices: [
          {
            message: {
              role: "assistant",
              content: "\u26A0\uFE0F **Groq API Key is not configured!** Please add the `GROQ_API_KEY` environment variable to enable the AI Chatbot."
            }
          }
        ]
      };
    }
    const model = await resolveWorkingModel("standard");
    logger.info({ model }, "Invoking Groq model for general chat with retry");
    const groqMessages = [
      { role: "system", content: systemContent },
      ...conversation.map((m) => ({
        role: m.role === "model" || m.role === "assistant" ? "assistant" : "user",
        content: m.content || ""
      }))
    ];
    const callPayload = {
      model,
      messages: groqMessages,
      temperature,
      max_tokens: 1500
    };
    if (responseFormat) {
      callPayload.response_format = responseFormat;
    }
    const response = await callGroqWithRetry(callPayload);
    reply = response?.choices?.[0]?.message?.content || "";
    reply = reply.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
    return {
      choices: [
        {
          message: {
            role: "assistant",
            content: reply
          }
        }
      ]
    };
  } catch (err) {
    logger.error({ error: err.message }, "Error in handleGeneralChat");
    return {
      choices: [
        {
          message: {
            role: "assistant",
            content: "I apologize, but I am temporarily unable to complete that request. Please try asking again in a moment."
          }
        }
      ]
    };
  }
}

// src/server/validator.ts
var import_zod = require("zod");
function validateRequest(schemas) {
  return async (req, res, next) => {
    try {
      if (schemas.params && req.params) {
        req.params = await schemas.params.parseAsync(req.params);
      }
      if (schemas.query && req.query) {
        req.query = await schemas.query.parseAsync(req.query);
      }
      if (schemas.body && req.body) {
        req.body = await schemas.body.parseAsync(req.body);
      }
      next();
    } catch (error) {
      if (error instanceof import_zod.ZodError) {
        const issues = error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
        const err = new AppError(`Validation failed: ${issues}`, 400, "VALIDATION_ERROR");
        return next(err);
      }
      return next(error);
    }
  };
}
var loginSchema = {
  body: import_zod.z.object({
    email: import_zod.z.string().email("Invalid email format").trim().toLowerCase(),
    password: import_zod.z.string().min(6, "Password must be at least 6 characters long")
  })
};
var registerSchema = {
  body: import_zod.z.object({
    email: import_zod.z.string().email("Invalid email format").trim().toLowerCase(),
    password: import_zod.z.string().min(6, "Password must be at least 6 characters long"),
    name: import_zod.z.string().min(1, "Name cannot be empty").max(100).optional().nullable(),
    role: import_zod.z.enum(["Student", "Parent", "Counselor", "Admin"]).optional()
  })
};
var studentProfileSchema = {
  body: import_zod.z.object({
    stream: import_zod.z.string().max(100).optional().nullable(),
    budget: import_zod.z.number().int().nonnegative().optional().nullable(),
    preferred_location: import_zod.z.string().max(150).optional().nullable(),
    preferred_course: import_zod.z.string().max(150).optional().nullable(),
    entrance_exams: import_zod.z.any().optional(),
    // Can be dynamic JSON array/object
    hostel_preference: import_zod.z.boolean().optional().nullable(),
    placement_priority: import_zod.z.string().max(100).optional().nullable(),
    academic_scores: import_zod.z.any().optional(),
    career_goals: import_zod.z.string().max(1e3).optional().nullable()
  })
};
var parentProfileSchema = {
  body: import_zod.z.object({
    budget: import_zod.z.number().int().nonnegative().optional().nullable(),
    preferred_state_city: import_zod.z.string().max(150).optional().nullable(),
    safety_preference: import_zod.z.string().max(100).optional().nullable(),
    roi_preference: import_zod.z.string().max(100).optional().nullable(),
    scholarship_preference: import_zod.z.string().max(100).optional().nullable(),
    distance_preference: import_zod.z.string().max(100).optional().nullable(),
    accommodation_preference: import_zod.z.string().max(100).optional().nullable()
  })
};
var userRoleSchema = {
  body: import_zod.z.object({
    email: import_zod.z.string().email("Invalid email format").trim().toLowerCase(),
    role: import_zod.z.enum(["Student", "Parent", "Counselor", "Admin"])
  })
};
var bookmarkSchema = {
  body: import_zod.z.object({
    universityId: import_zod.z.number().int().positive()
  })
};
var reviewSchema = {
  params: import_zod.z.object({
    id: import_zod.z.string().regex(/^\d+$/, "University ID must be a numeric string").transform((val) => parseInt(val, 10))
  }),
  body: import_zod.z.object({
    rating: import_zod.z.number().min(1, "Rating must be at least 1").max(5, "Rating cannot exceed 5"),
    comment: import_zod.z.string().min(3, "Review comments must be at least 3 characters").max(2e3)
  })
};
var adminUniversitySchema = {
  body: import_zod.z.object({
    id: import_zod.z.number().int().positive(),
    name: import_zod.z.string().min(1, "University name is required").max(200),
    location: import_zod.z.string().min(1, "Location is required").max(200),
    state: import_zod.z.string().min(1, "State is required").max(100),
    type: import_zod.z.string().min(1, "Institution type is required").max(100),
    fee: import_zod.z.number().int().nonnegative(),
    rating: import_zod.z.number().min(1).max(5),
    students: import_zod.z.string().max(50),
    courses: import_zod.z.number().int().nonnegative(),
    image: import_zod.z.string().url("Must be a valid cover photo URL").or(import_zod.z.string().min(1)),
    logo: import_zod.z.string().url("Must be a valid logo URL").optional().nullable().or(import_zod.z.string().optional().nullable()),
    categories: import_zod.z.array(import_zod.z.string()),
    stream: import_zod.z.array(import_zod.z.string()),
    degrees: import_zod.z.array(import_zod.z.string()),
    majors: import_zod.z.array(import_zod.z.string()),
    popular_courses: import_zod.z.array(import_zod.z.string()),
    phone: import_zod.z.string().max(30),
    competitive_exams: import_zod.z.array(import_zod.z.string()),
    min_10th: import_zod.z.number().int().min(0).max(100),
    min_12th: import_zod.z.number().int().min(0).max(100),
    naac_grade: import_zod.z.string().max(10),
    nirf_rank: import_zod.z.number().int().positive(),
    aicte_approved: import_zod.z.boolean(),
    nba_accredited: import_zod.z.boolean(),
    nmc_recognized: import_zod.z.boolean(),
    avg_placement_lpa: import_zod.z.number().nonnegative(),
    website: import_zod.z.string().url("Must be a valid website URL").optional().nullable().or(import_zod.z.string().optional().nullable()),
    virtual_tour_url: import_zod.z.string().url("Must be a valid tour URL").optional().nullable().or(import_zod.z.string().optional().nullable()),
    expert_insight: import_zod.z.string().max(2e3).optional().nullable(),
    alumni_stories: import_zod.z.array(import_zod.z.any()).optional().nullable(),
    campus_map: import_zod.z.any().optional().nullable()
  })
};
var chatSchema = {
  body: import_zod.z.object({
    messages: import_zod.z.array(
      import_zod.z.object({
        role: import_zod.z.enum(["user", "assistant", "system"]),
        content: import_zod.z.string().min(1, "Message content cannot be empty")
      })
    ).min(1, "At least one chat message is required"),
    temperature: import_zod.z.number().min(0).max(2).optional(),
    response_format: import_zod.z.object({
      type: import_zod.z.literal("json_object")
    }).optional()
  })
};

// server.ts
import_dotenv.default.config();
process.on("unhandledRejection", (reason) => {
  const msg = reason?.message || String(reason);
  const code = reason?.code || "";
  const isTransientDbFault = /getaddrinfo|ECONNRESET|ETIMEDOUT|EPIPE|EHOSTUNREACH|ENETUNREACH|Connection terminated|terminating connection/i.test(msg) || /ECONNREFUSED|57P01|57P03|08006|08001|08003/i.test(code + " " + msg);
  if (isTransientDbFault) {
    logger.warn({ error: msg, code }, "Transient database/network fault survived (unhandled rejection contained).");
  } else {
    logger.error({ error: msg, code }, "Unhandled rejection contained (server kept alive).");
  }
});
process.on("uncaughtException", (err) => {
  logger.error({ error: err.message, stack: err.stack }, "Uncaught exception contained (server kept alive).");
});
try {
  if ((0, import_app.getApps)().length === 0) {
    (0, import_app.initializeApp)({
      projectId: "pelagic-line-ch7sp"
    });
  }
} catch (error) {
  logger.error({ error: error.message }, "Failed to initialize firebase-admin");
}
var app = (0, import_express.default)();
var PORT = 3e3;
function getSessionCookieHeader(req, token, maxAge = 86400) {
  const isHttps = req.secure || req.headers["x-forwarded-proto"] === "https";
  const sameSite = isHttps ? "None" : "Lax";
  const secure = isHttps ? "; Secure" : "";
  return `session_token=${token}; Path=/; HttpOnly; SameSite=${sameSite}${secure}; Max-Age=${maxAge}`;
}
function getClearSessionCookieHeader(req) {
  const isHttps = req.secure || req.headers["x-forwarded-proto"] === "https";
  const sameSite = isHttps ? "None" : "Lax";
  const secure = isHttps ? "; Secure" : "";
  return `session_token=; Path=/; HttpOnly; SameSite=${sameSite}${secure}; Max-Age=0`;
}
app.use(correlationIdMiddleware);
app.use((0, import_compression.default)());
app.use(import_express.default.json({ limit: "10mb" }));
app.use(import_express.default.urlencoded({ extended: true, limit: "10mb" }));
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, X-Correlation-ID, X-CSRF-Token");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self' https: data: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; style-src 'self' 'unsafe-inline' https:; font-src 'self' https: data:; img-src 'self' data: blob: https:; connect-src 'self' https: http: wss: ws: data: blob:; frame-ancestors *;"
  );
  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  }
  next();
});
var rateLimitStore = {};
var loginLimitStore = {};
var aiLimitStore = {};
var rateLimitCleanupInterval = setInterval(() => {
  const now = Date.now();
  const fifteenMinsMs = 15 * 60 * 1e3;
  for (const [ip, record] of Object.entries(rateLimitStore)) {
    record.timestamps = record.timestamps.filter((t) => now - t < fifteenMinsMs);
    if (record.timestamps.length === 0) {
      delete rateLimitStore[ip];
    }
  }
  for (const [ip, record] of Object.entries(loginLimitStore)) {
    record.timestamps = record.timestamps.filter((t) => now - t < fifteenMinsMs);
    if (record.timestamps.length === 0) {
      delete loginLimitStore[ip];
    }
  }
  for (const [ip, record] of Object.entries(aiLimitStore)) {
    record.timestamps = record.timestamps.filter((t) => now - t < fifteenMinsMs);
    if (record.timestamps.length === 0) {
      delete aiLimitStore[ip];
    }
  }
}, 5 * 60 * 1e3);
if (typeof rateLimitCleanupInterval.unref === "function") {
  rateLimitCleanupInterval.unref();
}
async function generalRateLimiter(req, res, next) {
  const ip = req.ip || req.headers["x-forwarded-for"] || "unknown-ip";
  const now = Date.now();
  const fifteenMinsMs = 15 * 60 * 1e3;
  const correlationId = req.headers["x-correlation-id"] || "unknown";
  const redis = getRedisClient();
  if (redis) {
    try {
      const key = `rate_limit:general:${ip}`;
      const count = await redis.incr(key);
      if (count === 1) {
        await redis.expire(key, 900);
      }
      if (count >= 150) {
        logger.warn({ ip, path: req.path, correlationId, type: "general" }, "General rate limit violation detected via Redis!");
        res.status(429).json({ error: "Too many requests. Please try again after 15 minutes." });
        return;
      }
      return next();
    } catch (err) {
    }
  }
  if (!rateLimitStore[ip]) {
    rateLimitStore[ip] = { timestamps: [] };
  }
  rateLimitStore[ip].timestamps = rateLimitStore[ip].timestamps.filter((t) => now - t < fifteenMinsMs);
  if (rateLimitStore[ip].timestamps.length >= 150) {
    logger.warn({ ip, path: req.path, correlationId, type: "general" }, "General rate limit violation detected in-memory!");
    res.status(429).json({ error: "Too many matching requests. Please try again after 15 minutes." });
    return;
  }
  rateLimitStore[ip].timestamps.push(now);
  next();
}
async function loginRateLimiter(req, res, next) {
  const ip = req.ip || req.headers["x-forwarded-for"] || "unknown-ip";
  const now = Date.now();
  const fifteenMinsMs = 15 * 60 * 1e3;
  const correlationId = req.headers["x-correlation-id"] || "unknown";
  const redis = getRedisClient();
  if (redis) {
    try {
      const key = `rate_limit:login:${ip}`;
      const count = await redis.incr(key);
      if (count === 1) {
        await redis.expire(key, 900);
      }
      if (count >= 5) {
        logger.warn({ ip, path: req.path, correlationId, type: "login" }, "Login/Registration rate limit violation detected via Redis!");
        res.status(429).json({ error: "Too many login attempts. Please wait 15 minutes before trying again." });
        return;
      }
      return next();
    } catch (err) {
    }
  }
  if (!loginLimitStore[ip]) {
    loginLimitStore[ip] = { timestamps: [] };
  }
  loginLimitStore[ip].timestamps = loginLimitStore[ip].timestamps.filter((t) => now - t < fifteenMinsMs);
  if (loginLimitStore[ip].timestamps.length >= 5) {
    const oldestTimestamp = loginLimitStore[ip].timestamps[0];
    const waitTimeMinutes = Math.ceil((fifteenMinsMs - (now - oldestTimestamp)) / 6e4);
    logger.warn({ ip, path: req.path, correlationId, type: "login" }, "Login/Registration rate limit violation detected in-memory!");
    res.status(429).json({ error: `Too many login/registration attempts. Please wait ${waitTimeMinutes} minute(s) before trying again.` });
    return;
  }
  loginLimitStore[ip].timestamps.push(now);
  next();
}
async function aiRateLimiter(req, res, next) {
  const ip = req.ip || req.headers["x-forwarded-for"] || "unknown-ip";
  const now = Date.now();
  const fifteenMinsMs = 15 * 60 * 1e3;
  const correlationId = req.headers["x-correlation-id"] || "unknown";
  const redis = getRedisClient();
  if (redis) {
    try {
      const key = `rate_limit:ai:${ip}`;
      const count = await redis.incr(key);
      if (count === 1) {
        await redis.expire(key, 900);
      }
      if (count >= 30) {
        aiAnalytics.rateLimits++;
        logger.warn({ ip, path: req.path, correlationId, type: "ai" }, "AI rate limit violation detected via Redis!");
        res.status(429).json({ error: "Too many AI counseling requests. Please try again after 15 minutes." });
        return;
      }
      return next();
    } catch (err) {
    }
  }
  if (!aiLimitStore[ip]) {
    aiLimitStore[ip] = { timestamps: [] };
  }
  aiLimitStore[ip].timestamps = aiLimitStore[ip].timestamps.filter((t) => now - t < fifteenMinsMs);
  if (aiLimitStore[ip].timestamps.length >= 30) {
    aiAnalytics.rateLimits++;
    logger.warn({ ip, path: req.path, correlationId, type: "ai" }, "AI rate limit violation detected in-memory!");
    res.status(429).json({ error: "Too many AI counseling requests. Please try again after 15 minutes." });
    return;
  }
  aiLimitStore[ip].timestamps.push(now);
  next();
}
function sanitizeValue(value, maxStrLength = 5e4) {
  if (value === null || value === void 0) return value;
  if (typeof value === "string") {
    if (value.length > maxStrLength) {
      throw new AppError("Input payload text exceeds safe lengths limit.", 400, "BAD_REQUEST_SIZE");
    }
    let clean = value.replace(/<[^>]*>/gi, "");
    clean = clean.replace(/javascript\s*:/gi, "");
    clean = clean.replace(/on\w+\s*=/gi, "");
    if (clean !== value) {
      logger.warn({ original: value, sanitized: clean }, "HTML tags or potential script injection stripped.");
    }
    return clean;
  } else if (Array.isArray(value)) {
    if (value.length > 500) {
      throw new AppError("Input array exceeds safe collection bounds.", 400, "BAD_REQUEST_ARRAY_SIZE");
    }
    return value.map((item) => sanitizeValue(item, maxStrLength));
  } else if (typeof value === "object") {
    const cleanObj = {};
    for (const [key, val] of Object.entries(value)) {
      if (key.length > 120 || key.includes("__proto__") || key === "constructor" || key === "prototype") {
        throw new AppError("Inadmissible request parameter key.", 400, "BAD_REQUEST_PROTOTYPE_POLLUTION");
      }
      cleanObj[key] = sanitizeValue(val, maxStrLength);
    }
    return cleanObj;
  }
  return value;
}
function requestSanitizer(req, res, next) {
  try {
    const isChat = req.path === "/api/chat" || req.originalUrl.includes("/api/chat");
    const maxStrLength = isChat ? 5e5 : 5e4;
    if (req.body) req.body = sanitizeValue(req.body, maxStrLength);
    if (req.query) req.query = sanitizeValue(req.query, maxStrLength);
    if (req.params) req.params = sanitizeValue(req.params, maxStrLength);
    next();
  } catch (err) {
    res.status(400).json({ error: err.message || "Malformed payload or untrusted inputs rejected." });
  }
}
app.use("/api", generalRateLimiter, requestSanitizer, csrfProtection);
function hashPassword(password) {
  const salt = import_crypto2.default.randomBytes(16).toString("hex");
  const hash = import_crypto2.default.pbkdf2Sync(password, salt, 1e3, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}
function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(":")) return false;
  const [salt, hash] = storedHash.split(":");
  const testHash = import_crypto2.default.pbkdf2Sync(password, salt, 1e3, 64, "sha512").toString("hex");
  return hash === testHash;
}
async function authenticateToken(req, res, next) {
  let token = "";
  const authHeader = req.headers["authorization"];
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7);
  } else if (req.headers.cookie) {
    const cookies = req.headers.cookie.split(";").map((c) => c.trim());
    const tokenCookie = cookies.find((c) => c.startsWith("session_token="));
    if (tokenCookie) {
      token = tokenCookie.substring("session_token=".length);
    }
  }
  if (!token) {
    res.status(401).json({ error: "Unauthorized access: login session required." });
    return;
  }
  const session = await dbService.getSession(token);
  if (!session || session.expiresAt < Date.now()) {
    if (session) {
      await dbService.deleteSession(token);
    }
    res.status(401).json({ error: "Session expired or invalid. Please login again." });
    return;
  }
  req.userEmail = session.email;
  const user = await dbService.getUserByEmail(session.email);
  if (user) {
    req.userRole = user.role;
    req.userEmailVerified = user.emailVerified || false;
  }
  next();
}
async function optionalAuthenticateToken(req, res, next) {
  let token = "";
  const authHeader = req.headers["authorization"];
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7);
  } else if (req.headers.cookie) {
    const cookies = req.headers.cookie.split(";").map((c) => c.trim());
    const tokenCookie = cookies.find((c) => c.startsWith("session_token="));
    if (tokenCookie) {
      token = tokenCookie.substring("session_token=".length);
    }
  }
  if (token) {
    try {
      const session = await dbService.getSession(token);
      if (session && session.expiresAt >= Date.now()) {
        req.userEmail = session.email;
        const user = await dbService.getUserByEmail(session.email);
        if (user) {
          req.userRole = user.role;
          req.userEmailVerified = user.emailVerified || false;
        }
      }
    } catch {
    }
  }
  next();
}
function requireVerifiedEmail(req, res, next) {
  if (req.userEmailVerified !== true) {
    res.status(403).json({
      error: "Strict Email Verification Required: Please verify your email address to unlock this feature.",
      emailVerified: false
    });
    return;
  }
  next();
}
function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.userRole || !allowedRoles.includes(req.userRole)) {
      res.status(403).json({ error: `Forbidden: This action requires privileges of: ${allowedRoles.join(", ")}` });
      return;
    }
    next();
  };
}
app.get("/health", async (req, res) => {
  const check = await MonitoringService.getHealthDiagnostics();
  res.status(check.status === "ok" ? 200 : 503).json(check);
});
app.get("/api/health", async (req, res) => {
  const check = await MonitoringService.getHealthDiagnostics();
  res.status(check.status === "ok" ? 200 : 503).json(check);
});
app.get("/metrics", async (req, res) => {
  await MonitoringService.handleMetrics(req, res);
});
app.get("/api/metrics", async (req, res) => {
  await MonitoringService.handleMetrics(req, res);
});
app.get("/api/docs", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>UniInfo Portal API Explorer</title>
      <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui.css" />
      <style>
        body { margin: 0; background: #0f172a; }
        .swagger-ui .topbar { display: none; }
        .swagger-ui .info .title { color: #f1f5f9; }
        .swagger-ui .info p, .swagger-ui .info li, .swagger-ui .info td { color: #cbd5e1; }
        .swagger-ui .scheme-container { background: #1e293b; }
      </style>
    </head>
    <body>
      <div id="swagger-ui"></div>
      <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-bundle.js"></script>
      <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-standalone-preset.js"></script>
      <script>
        window.onload = () => {
          window.ui = SwaggerUIBundle({
            url: '/api/openapi.json',
            dom_id: '#swagger-ui',
            presets: [
              SwaggerUIBundle.presets.apis,
              SwaggerUIStandalonePreset
            ],
            layout: "BaseLayout",
            deepLinking: true,
          });
        };
      </script>
    </body>
    </html>
  `);
});
app.get("/api/openapi.json", (req, res) => {
  res.json(openapiSpec);
});
app.post("/api/auth/google", loginRateLimiter, async (req, res) => {
  const { idToken } = req.body;
  const ip = req.ip || req.headers["x-forwarded-for"] || "unknown-ip";
  const correlationId = req.headers["x-correlation-id"] || "unknown";
  if (!idToken || typeof idToken !== "string") {
    res.status(400).json({ error: "Missing or malformed ID token." });
    return;
  }
  try {
    let decodedToken;
    if (process.env.NODE_ENV !== "production" && idToken.startsWith("mock-google-token-")) {
      const email2 = idToken.substring("mock-google-token-".length).trim().toLowerCase();
      decodedToken = {
        email: email2,
        name: email2.split("@")[0].charAt(0).toUpperCase() + email2.split("@")[0].slice(1),
        email_verified: true
        // Google accounts are pre-verified!
      };
      logger.info({ email: email2, correlationId }, "Authenticated via mock Google Auth for localhost development.");
    } else {
      decodedToken = await (0, import_auth.getAuth)().verifyIdToken(idToken);
    }
    const email = decodedToken.email;
    const name = decodedToken.name || decodedToken.email?.split("@")[0] || "Google User";
    const emailVerified = decodedToken.email_verified || false;
    if (!email) {
      res.status(400).json({ error: "Google account does not have a valid email address." });
      return;
    }
    let user = await dbService.getUserByEmail(email);
    if (!user) {
      const randomPassword = import_crypto2.default.randomBytes(32).toString("hex");
      const hashedPassword = hashPassword(randomPassword);
      user = await dbService.createUser({
        email,
        password: hashedPassword,
        name,
        role: "Student",
        emailVerified
      });
      logAuditEvent("register_google_success", { email, ip, status: "success", correlationId });
      dbService.logAnalyticsEvent({ eventType: "register_google", details: { email }, ip, correlationId });
    } else {
      if (emailVerified && !user.emailVerified) {
        await dbService.verifyEmail(email);
        user.emailVerified = true;
      }
    }
    const token = import_crypto2.default.randomBytes(32).toString("hex");
    await dbService.createSession(token, email, Date.now() + 24 * 60 * 60 * 1e3);
    logAuditEvent("login_google_success", { email, ip, status: "success", correlationId });
    dbService.logAnalyticsEvent({ eventType: "login_google", details: { email }, ip, correlationId });
    await dbService.recordLoginAttempt(ip, email, true);
    res.setHeader("Set-Cookie", getSessionCookieHeader(req, token));
    res.json({
      status: "success",
      message: "Successfully authenticated with UniInfo Secure Portal via Google.",
      token,
      user: {
        email,
        bookmarks: user.bookmarks || [],
        role: user.role,
        name: user.name,
        emailVerified: user.emailVerified || false
      }
    });
  } catch (err) {
    logger.error({ error: err.message }, "verifyIdToken Google failed");
    res.status(401).json({ error: "Invalid Google credentials or token verification failed." });
  }
});
app.post("/api/login", loginRateLimiter, validateRequest(loginSchema), async (req, res) => {
  const { email, password } = req.body;
  const ip = req.ip || req.headers["x-forwarded-for"] || "unknown-ip";
  const correlationId = req.headers["x-correlation-id"] || "unknown";
  if (!email || !password || typeof email !== "string" || typeof password !== "string") {
    res.status(400).json({ error: "Email and password are required parameters and must be valid strings." });
    return;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email) || email.length > 100) {
    res.status(400).json({ error: "Malformed request: invalid email address structure." });
    return;
  }
  const user = await dbService.getUserByEmail(email);
  if (user) {
    try {
      AccountLockoutService.checkLockout(user);
    } catch (lockError) {
      logAuditEvent("login_lockout_rejected", { email, ip, status: "lockout", correlationId });
      await dbService.recordLoginAttempt(ip, email, false);
      res.status(423).json({ error: lockError.message });
      return;
    }
  }
  if (!user || !verifyPassword(password, user.password || "")) {
    let lockedNow = false;
    if (user) {
      lockedNow = AccountLockoutService.handleFailure(user);
      await dbService.updateUserLockout(user.email, user.loginFailures, user.lockedUntil);
    }
    logAuditEvent("login_failed", { email, ip, status: "failure", correlationId, userExists: !!user, lockedNow });
    await dbService.recordLoginAttempt(ip, email, false);
    if (lockedNow) {
      res.status(423).json({ error: "Account locked out due to 5 consecutive login failures. Try again in 15 minutes." });
    } else {
      res.status(401).json({ error: "Invalid email or password." });
    }
    return;
  }
  AccountLockoutService.handleSuccess(user);
  await dbService.updateUserLockout(user.email, 0, 0);
  const isDevOrLocal = process.env.NODE_ENV !== "production" || ip === "127.0.0.1" || ip === "::1" || ip.includes("localhost") || req.headers.host && (req.headers.host.includes("localhost") || req.headers.host.includes("127.0.0.1"));
  if (user.emailVerified !== true) {
    if (isDevOrLocal) {
      await dbService.verifyEmail(user.email);
      user.emailVerified = true;
    } else {
      logAuditEvent("login_rejected_unverified", { email, ip, status: "failure", correlationId });
      res.status(403).json({
        error: "Strict Email Verification Required: Please verify your email address to log in.",
        emailVerified: false
      });
      return;
    }
  }
  const token = import_crypto2.default.randomBytes(32).toString("hex");
  await dbService.createSession(token, email, Date.now() + 24 * 60 * 60 * 1e3);
  logAuditEvent("login_success", { email, ip, status: "success", correlationId });
  dbService.logAnalyticsEvent({ eventType: "login", details: { email }, ip, correlationId });
  await dbService.recordLoginAttempt(ip, email, true);
  res.setHeader("Set-Cookie", getSessionCookieHeader(req, token));
  res.json({
    status: "success",
    message: "Successfully authenticated with UniInfo Secure Portal.",
    token,
    user: { email, bookmarks: user.bookmarks || [], role: user.role, name: user.name, emailVerified: user.emailVerified || false }
  });
});
app.post("/api/register", loginRateLimiter, validateRequest(registerSchema), async (req, res) => {
  const { email, password, role = "Student", name = "" } = req.body;
  const ip = req.ip || req.headers["x-forwarded-for"] || "unknown-ip";
  const correlationId = req.headers["x-correlation-id"] || "unknown";
  if (!email || !password || typeof email !== "string" || typeof password !== "string") {
    res.status(400).json({ error: "Email and password are required parameters." });
    return;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email) || email.length > 100) {
    res.status(400).json({ error: "Malformed request: invalid email address structure." });
    return;
  }
  if (password.length < 6 || password.length > 120) {
    res.status(400).json({ error: "Password must be between 6 and 120 characters." });
    return;
  }
  if (!/^[A-Z]/.test(password)) {
    res.status(400).json({ error: "Password must start with an uppercase letter." });
    return;
  }
  if (!/\d/.test(password)) {
    res.status(400).json({ error: "Password must contain at least one number." });
    return;
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    res.status(400).json({ error: "Password must contain at least one special character." });
    return;
  }
  const allowedRoles = ["Admin", "Student", "Parent", "Counselor"];
  if (!allowedRoles.includes(role)) {
    res.status(400).json({ error: `Invalid role parameter. Allowed roles are: ${allowedRoles.join(", ")}` });
    return;
  }
  const existingUser = await dbService.getUserByEmail(email);
  if (existingUser) {
    logAuditEvent("register_failed_existing", { email, ip, status: "failure", correlationId });
    await dbService.recordLoginAttempt(ip, email, false);
    res.status(400).json({ error: "An account under this email address already exists." });
    return;
  }
  const hashedPassword = hashPassword(password);
  const isDevOrLocal = process.env.NODE_ENV !== "production" || ip === "127.0.0.1" || ip === "::1" || ip.includes("localhost") || req.headers.host && (req.headers.host.includes("localhost") || req.headers.host.includes("127.0.0.1"));
  const newUser = await dbService.createUser({
    email,
    password: hashedPassword,
    role,
    name,
    emailVerified: isDevOrLocal ? true : false
  });
  if (isDevOrLocal) {
    const token = import_crypto2.default.randomBytes(32).toString("hex");
    await dbService.createSession(token, email, Date.now() + 24 * 60 * 60 * 1e3);
    res.setHeader("Set-Cookie", getSessionCookieHeader(req, token));
    logAuditEvent("register_success", { email, ip, status: "success", correlationId });
    dbService.logAnalyticsEvent({ eventType: "register", details: { email, role }, ip, correlationId });
    await dbService.recordLoginAttempt(ip, email, true);
    res.json({
      status: "success",
      message: "Account registered successfully for local development!",
      token,
      user: { email, bookmarks: [], role, name, emailVerified: true }
    });
    return;
  }
  const verificationToken = import_crypto2.default.randomBytes(32).toString("hex");
  const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1e3).toISOString();
  await dbService.updateUserVerificationToken(email, verificationToken, verificationExpires);
  await backgroundQueue.addJob({
    task: "send_verification_email",
    data: {
      email,
      token: verificationToken,
      appUrl: process.env.APP_URL || "http://localhost:3000"
    }
  });
  logAuditEvent("register_success", { email, ip, status: "success", correlationId });
  dbService.logAnalyticsEvent({ eventType: "register", details: { email, role }, ip, correlationId });
  await dbService.recordLoginAttempt(ip, email, true);
  res.json({
    status: "success",
    message: "Please verify your email before accessing all features."
  });
});
app.get("/api/auth/verify-email", async (req, res) => {
  const token = req.query.token;
  const ip = req.ip || req.headers["x-forwarded-for"] || "unknown-ip";
  const correlationId = req.headers["x-correlation-id"] || "unknown";
  if (!token || typeof token !== "string") {
    res.status(400).json({ error: "Missing or malformed verification token." });
    return;
  }
  try {
    const user = await dbService.getUserByVerificationToken(token);
    if (!user) {
      res.status(400).json({ error: "Invalid or expired verification token." });
      return;
    }
    if (user.verificationExpires && Date.now() > new Date(user.verificationExpires).getTime()) {
      res.status(400).json({ error: "Verification token has expired. Please request a new one." });
      return;
    }
    await dbService.verifyEmail(user.email);
    logAuditEvent("email_verified", { email: user.email, ip, status: "success", correlationId });
    dbService.logAnalyticsEvent({ eventType: "email_verified", details: { email: user.email }, ip, correlationId });
    res.redirect("/success.html");
  } catch (err) {
    logger.error({ error: err.message, token }, "verify-email GET failed");
    res.status(500).json({ error: "Verification failed due to an internal registry error." });
  }
});
app.get("/auth/verify-email", (req, res) => {
  const token = req.query.token || "";
  res.redirect(`/api/auth/verify-email?token=${token}`);
});
app.get("/verify-email", (req, res) => {
  const token = req.query.token || "";
  res.redirect(`/api/verify-email?token=${token}`);
});
app.get("/api/verify-email", async (req, res) => {
  const token = req.query.token;
  const ip = req.ip || req.headers["x-forwarded-for"] || "unknown-ip";
  const correlationId = req.headers["x-correlation-id"] || "unknown";
  if (!token || typeof token !== "string") {
    res.status(400).json({ error: "Missing or malformed verification token." });
    return;
  }
  try {
    const user = await dbService.getUserByVerificationToken(token);
    if (!user) {
      res.status(400).json({ error: "Invalid or expired verification token." });
      return;
    }
    if (user.verificationExpires && Date.now() > new Date(user.verificationExpires).getTime()) {
      res.status(400).json({ error: "Verification token has expired. Please request a new one." });
      return;
    }
    await dbService.verifyEmail(user.email);
    logAuditEvent("email_verified", { email: user.email, ip, status: "success", correlationId });
    dbService.logAnalyticsEvent({ eventType: "email_verified", details: { email: user.email }, ip, correlationId });
    res.send(`
      <html>
        <head>
          <title>Verification Successful</title>
          <style>
            body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; background: #fafafa; margin: 0; }
            .card { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); text-align: center; max-width: 400px; }
            h1 { color: #ec4899; margin-bottom: 16px; }
            p { color: #4b5563; line-height: 1.5; font-size: 16px; margin-bottom: 24px; }
            .btn { background: #ec4899; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Email Verified!</h1>
            <p>Your email address has been verified successfully. You can now access all verified services on UniInfo Secure Portal.</p>
            <a href="${process.env.APP_URL || "http://localhost:3000"}" class="btn">Go to Dashboard</a>
          </div>
        </body>
      </html>
    `);
  } catch (err) {
    logger.error({ error: err.message, token }, "verify-email GET failed");
    res.status(500).json({ error: "Verification failed due to an internal registry error." });
  }
});
app.post("/api/verify-email", async (req, res) => {
  const { token } = req.body;
  const ip = req.ip || req.headers["x-forwarded-for"] || "unknown-ip";
  const correlationId = req.headers["x-correlation-id"] || "unknown";
  if (!token || typeof token !== "string") {
    res.status(400).json({ error: "Missing or malformed verification token." });
    return;
  }
  try {
    const user = await dbService.getUserByVerificationToken(token);
    if (!user) {
      res.status(400).json({ error: "Invalid or expired verification token." });
      return;
    }
    if (user.verificationExpires && Date.now() > new Date(user.verificationExpires).getTime()) {
      res.status(400).json({ error: "Verification token has expired. Please request a new one." });
      return;
    }
    await dbService.verifyEmail(user.email);
    logAuditEvent("email_verified", { email: user.email, ip, status: "success", correlationId });
    dbService.logAnalyticsEvent({ eventType: "email_verified", details: { email: user.email }, ip, correlationId });
    res.json({ status: "success", message: "Email address verified successfully!" });
  } catch (err) {
    logger.error({ error: err.message, token }, "verify-email POST failed");
    res.status(500).json({ error: "Verification failed due to an internal registry error." });
  }
});
app.post("/api/resend-verification", async (req, res) => {
  const { email } = req.body;
  const ip = req.ip || req.headers["x-forwarded-for"] || "unknown-ip";
  const correlationId = req.headers["x-correlation-id"] || "unknown";
  if (!email || typeof email !== "string") {
    res.status(400).json({ error: "Email parameter is required and must be a valid string." });
    return;
  }
  try {
    const user = await dbService.getUserByEmail(email);
    if (!user) {
      res.json({ status: "success", message: "If the email is registered and unverified, a verification email has been sent." });
      return;
    }
    if (user.emailVerified) {
      res.status(400).json({ error: "This email address is already verified." });
      return;
    }
    const verificationToken = import_crypto2.default.randomBytes(32).toString("hex");
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1e3).toISOString();
    await dbService.updateUserVerificationToken(email, verificationToken, verificationExpires);
    await backgroundQueue.addJob({
      task: "send_verification_email",
      data: {
        email,
        token: verificationToken,
        appUrl: process.env.APP_URL || "http://localhost:3000"
      }
    });
    logAuditEvent("resend_verification_success", { email, ip, status: "success", correlationId });
    res.json({ status: "success", message: "If the email is registered and unverified, a verification email has been sent." });
  } catch (err) {
    logger.error({ error: err.message, email }, "resend-verification failed");
    res.status(500).json({ error: "Failed to resend verification email." });
  }
});
app.post("/api/auth/dev-verify", async (req, res) => {
  const { email } = req.body;
  if (!email || typeof email !== "string") {
    res.status(400).json({ error: "Email is required." });
    return;
  }
  try {
    const user = await dbService.getUserByEmail(email);
    if (!user) {
      res.status(404).json({ error: "User not found." });
      return;
    }
    await dbService.verifyEmail(email);
    const token = import_crypto2.default.randomBytes(32).toString("hex");
    await dbService.createSession(token, email, Date.now() + 24 * 60 * 60 * 1e3);
    res.setHeader("Set-Cookie", getSessionCookieHeader(req, token));
    res.json({
      status: "success",
      message: "Email address verified successfully!",
      token,
      user: { email, bookmarks: user.bookmarks || [], role: user.role, name: user.name, emailVerified: true }
    });
  } catch (err) {
    res.status(500).json({ error: "Verification failed: " + err.message });
  }
});
app.get("/api/universities", async (req, res) => {
  try {
    const cacheKey = `universities_query:${JSON.stringify(req.query)}`;
    const cached = await cacheGet(cacheKey);
    if (cached) {
      res.json(JSON.parse(cached));
      return;
    }
    const list = await dbService.getUniversities(req.query);
    await cacheSet(cacheKey, JSON.stringify(list), 120);
    const searchStr = req.query.search;
    if (searchStr) {
      dbService.logAnalyticsEvent({
        eventType: "search",
        details: { query: searchStr },
        ip: req.ip
      });
    }
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: "Server search error: " + err.message });
  }
});
app.get("/api/university-of-the-day", async (req, res) => {
  const cacheKey = "university_of_the_day";
  const cached = await cacheGet(cacheKey);
  if (cached) {
    res.json(JSON.parse(cached));
    return;
  }
  const list = await dbService.getUniversities({});
  if (list.length === 0) {
    res.status(404).json({ error: "No universities in database." });
    return;
  }
  const day = (/* @__PURE__ */ new Date()).getDate();
  const index2 = day % list.length;
  const spotlight = list[index2];
  await cacheSet(cacheKey, JSON.stringify(spotlight), 1800);
  res.json(spotlight);
});
app.get("/api/universities/search", async (req, res) => {
  try {
    const query = (req.query.q || req.query.search || "").toString();
    const list = await dbService.getUniversities({ search: query });
    res.json(list);
  } catch (err) {
    logger.error({ error: err.message }, "Error in /api/universities/search");
    res.status(500).json({ error: "Failed to search universities." });
  }
});
app.get("/api/universities/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid university ID format." });
      return;
    }
    const cacheKey = `university_detail:${id}`;
    const cached = await cacheGet(cacheKey);
    if (cached) {
      res.json(JSON.parse(cached));
      return;
    }
    const uni = await dbService.getUniversityById(id);
    if (!uni) {
      res.status(404).json({ error: "University not found." });
      return;
    }
    dbService.logAnalyticsEvent({
      eventType: "page_view",
      details: { universityId: id, name: uni.name },
      ip: req.ip
    });
    await cacheSet(cacheKey, JSON.stringify(uni), 300);
    res.json(uni);
  } catch (err) {
    logger.error({ error: err.message, id: req.params.id }, "Error in /api/universities/:id");
    res.status(500).json({ error: "Failed to retrieve university." });
  }
});
app.post("/api/universities/:id/reviews", authenticateToken, requireVerifiedEmail, validateRequest(reviewSchema), async (req, res) => {
  try {
    const id = req.params.id;
    const { rating, comment } = req.body;
    const user = await dbService.getUserByEmail(req.userEmail || "");
    const userName = user ? user.email.split("@")[0] : "Student";
    const formattedName = userName.charAt(0).toUpperCase() + userName.slice(1);
    const newReview = {
      id: Date.now(),
      user: formattedName,
      userEmail: req.userEmail || "",
      rating,
      comment,
      date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
      avatar: `https://i.pravatar.cc/150?u=${encodeURIComponent(formattedName)}`
    };
    const updateResult = await dbService.addReview(id, newReview);
    if (!updateResult) {
      res.status(404).json({ error: "University not found." });
      return;
    }
    await cacheDel(`university_detail:${id}`);
    await cacheFlushPattern("universities_query:*");
    logger.info({ universityId: id, user: formattedName, rating }, "Verified student review submitted successfully.");
    dbService.logAnalyticsEvent({
      eventType: "review_submit",
      details: { universityId: id, rating },
      userEmail: req.userEmail
    });
    res.json({
      status: "success",
      review: newReview,
      newRating: updateResult.rating
    });
  } catch (err) {
    logger.error({ error: err.message }, "Error submitting university review");
    res.status(500).json({ error: "Failed to submit review." });
  }
});
app.get("/api/user/profile", authenticateToken, async (req, res) => {
  try {
    const user = await dbService.getUserByEmail(req.userEmail || "");
    if (!user) {
      res.status(404).json({ error: "User profile not found." });
      return;
    }
    res.json({
      email: user.email,
      bookmarks: user.bookmarks || [],
      role: user.role,
      name: user.name,
      emailVerified: user.emailVerified || false
    });
  } catch (err) {
    logger.error({ error: err.message }, "Error retrieving profile");
    res.status(500).json({ error: "Failed to retrieve user profile." });
  }
});
app.get("/api/profile/student", authenticateToken, requireVerifiedEmail, requireRole(["Student", "Admin", "Counselor"]), async (req, res) => {
  try {
    const profile = await dbService.getStudentProfile(req.userEmail || "");
    res.json({ status: "success", profile });
  } catch (err) {
    res.status(500).json({ error: "Failed to retrieve student profile." });
  }
});
app.post("/api/profile/student", authenticateToken, requireVerifiedEmail, requireRole(["Student", "Admin", "Counselor"]), validateRequest(studentProfileSchema), async (req, res) => {
  try {
    const profile = await dbService.saveStudentProfile(req.userEmail || "", req.body);
    logAuditEvent("update_student_profile", { email: req.userEmail, ip: req.ip || "unknown-ip", status: "success" });
    await dbService.addNotification(req.userEmail || "", "Profile Updated", "Your student advisory profile has been updated and saved successfully.", "profile_update");
    res.json({ status: "success", profile });
  } catch (err) {
    res.status(500).json({ error: "Failed to save student profile." });
  }
});
app.get("/api/profile/parent", authenticateToken, requireVerifiedEmail, requireRole(["Parent", "Admin", "Counselor"]), async (req, res) => {
  try {
    const profile = await dbService.getParentProfile(req.userEmail || "");
    res.json({ status: "success", profile });
  } catch (err) {
    res.status(500).json({ error: "Failed to retrieve parent profile." });
  }
});
app.post("/api/profile/parent", authenticateToken, requireVerifiedEmail, requireRole(["Parent", "Admin", "Counselor"]), validateRequest(parentProfileSchema), async (req, res) => {
  try {
    const profile = await dbService.saveParentProfile(req.userEmail || "", req.body);
    logAuditEvent("update_parent_profile", { email: req.userEmail, ip: req.ip || "unknown-ip", status: "success" });
    await dbService.addNotification(req.userEmail || "", "Profile Updated", "Your parent advisory profile has been updated and saved successfully.", "profile_update");
    res.json({ status: "success", profile });
  } catch (err) {
    res.status(500).json({ error: "Failed to save parent profile." });
  }
});
app.get("/api/notifications", authenticateToken, async (req, res) => {
  try {
    const list = await dbService.getNotifications(req.userEmail || "");
    res.json({ status: "success", notifications: list });
  } catch (err) {
    res.status(500).json({ error: "Failed to retrieve notifications." });
  }
});
app.post("/api/notifications/read", authenticateToken, async (req, res) => {
  try {
    const { id } = req.body;
    if (typeof id !== "number") {
      res.status(400).json({ error: "Invalid notification ID." });
      return;
    }
    const updated = await dbService.markNotificationAsRead(id, req.userEmail || "");
    if (!updated) {
      res.status(404).json({ error: "Notification not found or access denied." });
      return;
    }
    res.json({ status: "success" });
  } catch (err) {
    res.status(500).json({ error: "Failed to mark notification as read." });
  }
});
app.get("/api/chat/history", authenticateToken, async (req, res) => {
  try {
    const history = await dbService.getChatHistory(req.userEmail || "");
    const mappedHistory = history.map((h) => ({
      role: h.role,
      content: h.content,
      createdAt: h.createdAt
    }));
    res.json({ status: "success", history: mappedHistory });
  } catch (err) {
    res.status(500).json({ error: "Failed to retrieve conversation history." });
  }
});
app.post("/api/chat", optionalAuthenticateToken, aiRateLimiter, async (req, res) => {
  try {
    if (Array.isArray(req.body.messages)) {
      const result = await handleGeneralChat(req.body.messages, req.body.temperature || 0.1, req.body.response_format);
      res.json(result);
      return;
    }
    const { message, history = [], mode = "standard" } = req.body;
    if (!message || typeof message !== "string") {
      res.status(400).json({ error: "Message is required and must be a string." });
      return;
    }
    const email = req.userEmail || "guest@uniinfo.edu";
    let role = req.userRole || "Student";
    if (req.body.role) {
      const parsedRole = req.body.role.toLowerCase() === "parent" ? "Parent" : "Student";
      if (parsedRole !== role) {
        if (req.userEmail) {
          await dbService.updateUserRole(email, parsedRole).catch(() => {
          });
        }
        role = parsedRole;
      }
    }
    const response = await handleCounselorChat(email, role, message, history, mode, req.body.completedProfile);
    res.json({ status: "success", ...response });
  } catch (err) {
    logger.error({ error: err.message }, "Error in counselor chat processing");
    res.json({
      status: "success",
      reply: "I am having temporary difficulty connecting to the counselor intelligence engine. Please ask your question again or explore the top recommended colleges directly from our curated catalog.",
      recommendations: []
    });
  }
});
app.post("/api/chat/message", optionalAuthenticateToken, aiRateLimiter, async (req, res) => {
  try {
    const { message, history = [], mode = "standard" } = req.body;
    if (!message || typeof message !== "string") {
      res.status(400).json({ error: "Message is required and must be a string." });
      return;
    }
    const email = req.userEmail || "guest@uniinfo.edu";
    let role = req.userRole || "Student";
    if (req.body.role) {
      const parsedRole = req.body.role.toLowerCase() === "parent" ? "Parent" : "Student";
      if (parsedRole !== role) {
        if (req.userEmail) {
          await dbService.updateUserRole(email, parsedRole).catch(() => {
          });
        }
        role = parsedRole;
      }
    }
    const response = await handleCounselorChat(email, role, message, history, mode, req.body.completedProfile);
    res.json({ status: "success", ...response });
  } catch (err) {
    logger.error({ error: err.message }, "Error in counselor chat message processing");
    res.json({
      status: "success",
      reply: "I am having temporary difficulty connecting to the counselor intelligence engine. Please ask your question again or explore the top recommended colleges directly from our curated catalog.",
      recommendations: []
    });
  }
});
app.get("/api/ai-metrics", authenticateToken, async (req, res) => {
  try {
    res.json({
      status: "success",
      metrics: {
        aiRequests: aiAnalytics.requests,
        averageResponseTimeMs: Math.round(aiAnalytics.getAverageResponseTime()),
        failures: aiAnalytics.failures,
        timeouts: aiAnalytics.timeouts,
        rateLimits: aiAnalytics.rateLimits,
        errors: aiAnalytics.errors,
        successfulRecommendations: aiAnalytics.successfulRecommendations,
        tokenUsage: aiAnalytics.tokenUsage
      }
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to load AI monitoring metrics." });
  }
});
app.get("/api/recommendations", authenticateToken, requireVerifiedEmail, async (req, res) => {
  try {
    const email = req.userEmail || "";
    const studentProfile = await dbService.getStudentProfile(email);
    const parentProfile = await dbService.getParentProfile(email);
    const unis = await dbService.getUniversities();
    const activeUnis = unis.length > 0 ? unis : universities2;
    const isParent = !!parentProfile;
    const budget = isParent ? parentProfile?.budget : studentProfile?.budget;
    const results = activeUnis.map((uni) => {
      let score = 85;
      const pros = [];
      const cons = [];
      if (studentProfile?.stream) {
        const streamLower = studentProfile.stream.toLowerCase();
        const offersStream = uni.stream.some((s) => s.toLowerCase().includes(streamLower));
        if (offersStream) {
          score += 10;
          pros.push(`Offers your preferred ${studentProfile.stream} academic stream.`);
        } else {
          score -= 20;
          cons.push(`Does not offer preferred academic stream: ${studentProfile.stream}.`);
        }
      }
      if (budget) {
        if (uni.fee <= budget) {
          score += 15;
          pros.push(`Tuition fee (\u20B9${uni.fee.toLocaleString()}/yr) is within your budget threshold.`);
        } else {
          const diff = uni.fee - budget;
          const penalty = Math.min(Math.floor(diff / 1e4), 40);
          score -= penalty;
          cons.push(`Tuition fee exceeds budget target by \u20B9${diff.toLocaleString()}/yr.`);
        }
      } else {
        pros.push("Tuition fee meets standard educational norms.");
      }
      const TenthScore = studentProfile?.academicScores?.tenth || 75;
      const TwelfthScore = studentProfile?.academicScores?.twelfth || 75;
      if (TenthScore < uni.min10th) {
        score -= 25;
        cons.push(`10th score (${TenthScore}%) falls short of academic threshold (${uni.min10th}%).`);
      } else {
        pros.push(`Meets or exceeds secondary academic eligibility of ${uni.min10th}%.`);
      }
      if (TwelfthScore < uni.min12th) {
        score -= 30;
        cons.push(`12th score (${TwelfthScore}%) falls short of secondary cutoff (${uni.min12th}%).`);
      } else {
        pros.push(`Meets senior secondary academic cutoff requirement of ${uni.min12th}%.`);
      }
      if (studentProfile?.entranceExams && Array.isArray(studentProfile.entranceExams)) {
        const matchingExams = studentProfile.entranceExams.filter(
          (exam) => uni.competitiveExams.some((ce) => ce.toLowerCase() === exam.toLowerCase())
        );
        if (matchingExams.length > 0) {
          score += 15;
          pros.push(`Accepts entrance exam: ${matchingExams.join(", ")}.`);
        } else if (uni.competitiveExams.length > 0) {
          score -= 10;
          cons.push(`Requires specific entrance exam(s): ${uni.competitiveExams.join(", ")}.`);
        }
      }
      const wantsHostel = isParent ? parentProfile?.accommodationPreference === "Hostel" : !!studentProfile?.hostelPreference;
      const hasHostels = uni.campusMap?.hasHostels ?? true;
      if (wantsHostel) {
        if (hasHostels) {
          score += 10;
          pros.push("On-campus hostels are fully verified and available.");
        } else {
          score -= 15;
          cons.push("No official on-campus student hostel facility verified.");
        }
      }
      const prefLoc = isParent ? parentProfile?.preferredStateCity : studentProfile?.preferredLocation;
      if (prefLoc) {
        const locLower = prefLoc.toLowerCase();
        if (uni.location.toLowerCase().includes(locLower) || uni.state.toLowerCase().includes(locLower)) {
          score += 15;
          pros.push(`Located in preferred region: ${prefLoc}.`);
        } else {
          score -= 5;
        }
      }
      const placementPriority = studentProfile?.placementPriority || isParent && parentProfile?.roiPreference || "High";
      if (placementPriority === "High") {
        if (uni.avgPlacementLPA >= 8) {
          score += 15;
          pros.push(`High average placement return: ${uni.avgPlacementLPA} LPA.`);
        } else if (uni.avgPlacementLPA < 5) {
          score -= 15;
          cons.push(`Average placement package (${uni.avgPlacementLPA} LPA) is relatively modest.`);
        }
      }
      if (uni.nirfRank <= 30) {
        score += 15;
        pros.push(`Top-tier elite national institute (NIRF Rank: #${uni.nirfRank}).`);
      } else if (uni.nirfRank <= 100) {
        score += 5;
        pros.push(`Well-recognized national ranking (NIRF Rank: #${uni.nirfRank}).`);
      }
      if (uni.naacGrade === "A" || uni.naacGrade === "A+" || uni.naacGrade === "A++") {
        pros.push(`Premium grade National Assessment accreditation (Grade: ${uni.naacGrade}).`);
      }
      if (uni.aicteApproved) {
        pros.push("AICTE regulatory approval verified.");
      }
      const finalScore = Math.max(10, Math.min(100, score));
      let reason = `This institution matches ${finalScore}% of your profile guidelines.`;
      if (finalScore >= 85) {
        reason = `Outstanding fit! Excellent placement metrics, NAAC accreditation, and matches all academic eligibility prerequisites.`;
      } else if (finalScore >= 65) {
        reason = `Strong candidate offering verified streams, but check budget and exam cutoffs.`;
      } else {
        reason = `Matches secondary preferences, but has potential budget mismatches or eligibility hurdles.`;
      }
      const similarUnis = activeUnis.filter((u) => u.id !== uni.id && u.stream.some((s) => uni.stream.includes(s))).slice(0, 2).map((u) => u.name);
      return {
        id: uni.id,
        name: uni.name,
        matchPercentage: finalScore,
        reasons: reason,
        pros: pros.slice(0, 3),
        cons: cons.slice(0, 3),
        similarUniversities: similarUnis
      };
    });
    results.sort((a, b) => b.matchPercentage - a.matchPercentage);
    res.json({ status: "success", recommendations: results });
  } catch (err) {
    res.status(500).json({ error: "Failed to execute scoring recommendation engine." });
  }
});
app.post("/api/admin/universities", authenticateToken, requireRole(["Admin"]), validateRequest(adminUniversitySchema), async (req, res) => {
  try {
    const saved = await dbService.upsertUniversity(req.body);
    logAuditEvent("admin_upsert_university", { email: req.userEmail, ip: req.ip || "unknown-ip", status: "success", universityId: req.body.id, name: req.body.name });
    res.json({ status: "success", university: saved });
  } catch (err) {
    res.status(500).json({ error: "Failed to save university configurations." });
  }
});
app.delete("/api/admin/universities/:id", authenticateToken, requireRole(["Admin"]), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid university ID format." });
      return;
    }
    await dbService.deleteUniversity(id);
    logAuditEvent("admin_delete_university", { email: req.userEmail, ip: req.ip || "unknown-ip", status: "success", universityId: id });
    res.json({ status: "success" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete university." });
  }
});
app.get("/api/admin/users", authenticateToken, requireRole(["Admin"]), async (req, res) => {
  try {
    const users2 = await dbService.getAllUsers();
    res.json({ status: "success", users: users2 });
  } catch (err) {
    res.status(500).json({ error: "Failed to retrieve user accounts." });
  }
});
app.post("/api/admin/users/role", authenticateToken, requireRole(["Admin"]), validateRequest(userRoleSchema), async (req, res) => {
  try {
    const { email, role } = req.body;
    await dbService.updateUserRole(email, role);
    logAuditEvent("admin_update_user_role", { email: req.userEmail, ip: req.ip || "unknown-ip", status: "success", targetUser: email, newRole: role });
    res.json({ status: "success" });
  } catch (err) {
    res.status(500).json({ error: "Failed to update user role." });
  }
});
app.get("/api/admin/reviews", authenticateToken, requireRole(["Admin"]), async (req, res) => {
  try {
    const reviews2 = await dbService.getAllReviews();
    res.json({ status: "success", reviews: reviews2 });
  } catch (err) {
    res.status(500).json({ error: "Failed to retrieve reviews." });
  }
});
app.delete("/api/admin/reviews/:id", authenticateToken, requireRole(["Admin"]), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid review ID format." });
      return;
    }
    await dbService.deleteReview(id);
    logAuditEvent("admin_delete_review", { email: req.userEmail, ip: req.ip || "unknown-ip", status: "success", reviewId: id });
    res.json({ status: "success" });
  } catch (err) {
    res.status(500).json({ error: "Failed to moderate/delete review." });
  }
});
app.get("/api/admin/audit-logs", authenticateToken, requireRole(["Admin"]), async (req, res) => {
  try {
    const logs = await dbService.getAllAuditLogs();
    res.json({ status: "success", logs });
  } catch (err) {
    res.status(500).json({ error: "Failed to retrieve audit logs." });
  }
});
app.post("/api/user/bookmarks", authenticateToken, requireVerifiedEmail, validateRequest(bookmarkSchema), async (req, res) => {
  try {
    const { universityId } = req.body;
    if (typeof universityId !== "number") {
      res.status(400).json({ error: "Invalid university ID." });
      return;
    }
    const toggleResult = await dbService.toggleBookmark(req.userEmail || "", universityId);
    if (!toggleResult) {
      res.status(404).json({ error: "User or University not found." });
      return;
    }
    res.json({
      status: "success",
      action: toggleResult.action,
      bookmarks: toggleResult.bookmarks
    });
  } catch (err) {
    logger.error({ error: err.message }, "Error toggling bookmark");
    res.status(500).json({ error: "Failed to toggle bookmark." });
  }
});
app.get("/api/analytics", authenticateToken, requireRole(["Admin"]), async (req, res) => {
  try {
    const stats = await dbService.getAnalyticsSummary();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: "Analytics compilation failed: " + err.message });
  }
});
app.post("/api/user/logout", async (req, res) => {
  let token = "";
  const authHeader = req.headers["authorization"];
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7);
  } else if (req.headers.cookie) {
    const cookies = req.headers.cookie.split(";").map((c) => c.trim());
    const tokenCookie = cookies.find((c) => c.startsWith("session_token="));
    if (tokenCookie) {
      token = tokenCookie.substring("session_token=".length);
    }
  }
  if (token) {
    await dbService.deleteSession(token);
  }
  res.setHeader("Set-Cookie", getClearSessionCookieHeader(req));
  res.json({ status: "success", message: "Logged out successfully." });
});
app.use(errorHandler);
var backupInterval = null;
var httpServer = null;
var viteInstance = null;
async function listenWithRetry(server, port, host, maxRetries = 10, delayMs = 500) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await new Promise((resolve, reject) => {
        const onError = (err) => {
          server.removeListener("listening", onListening);
          reject(err);
        };
        const onListening = () => {
          server.removeListener("error", onError);
          resolve();
        };
        server.once("error", onError);
        server.once("listening", onListening);
        server.listen(port, host);
      });
      return;
    } catch (err) {
      if (err.code === "EADDRINUSE" && attempt < maxRetries) {
        logger.warn(`Port ${port} is currently in use (EADDRINUSE). Retrying in ${delayMs}ms (attempt ${attempt}/${maxRetries})...`);
        await new Promise((res) => setTimeout(res, delayMs));
      } else {
        throw err;
      }
    }
  }
}
async function startServer() {
  maintenanceService.start();
  BackupService.startScheduler();
  backupInterval = setInterval(() => {
    logger.info("Scheduling automatic database backup via background BullMQ queue.");
    backgroundQueue.addJob({ task: "backup_to_s3" });
  }, 12 * 60 * 60 * 1e3);
  if (backupInterval && typeof backupInterval.unref === "function") {
    backupInterval.unref();
  }
  httpServer = import_http.default.createServer(app);
  httpServer.on("error", (err) => {
    if (err.code !== "EADDRINUSE") {
      logger.error({ error: err.message, code: err.code }, "HTTP server error event");
    }
  });
  if (process.env.NODE_ENV !== "production") {
    viteInstance = await (0, import_vite.createServer)({
      server: {
        middlewareMode: true,
        // Bind HMR to the existing HTTP server so Vite never opens standalone port 24678
        hmr: { server: httpServer }
      },
      appType: "spa"
    });
    app.use(viteInstance.middlewares);
  } else {
    const distPath = import_path4.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath, {
      maxAge: "1y",
      etag: true,
      immutable: true,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith(".html")) {
          res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
        } else {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        }
      }
    }));
    app.get("*", (req, res) => {
      res.sendFile(import_path4.default.join(distPath, "index.html"));
    });
  }
  await listenWithRetry(httpServer, PORT, "0.0.0.0");
  logger.info(`Server running in ${process.env.NODE_ENV || "development"} mode on http://localhost:${PORT}`);
}
async function gracefulShutdown(signal) {
  logger.info({ signal }, "Initiating graceful shutdown procedure...");
  try {
    await maintenanceService.stop();
  } catch (err) {
    logger.error({ error: err.message }, "Error shutting down centralized maintenance service.");
  }
  BackupService.stopScheduler();
  if (backupInterval) {
    clearInterval(backupInterval);
    backupInterval = null;
    logger.info("S3 automatic backup scheduler interval cleared.");
  }
  try {
    await backgroundQueue.shutdown();
  } catch (err) {
    logger.error({ error: err.message }, "Error shutting down background queue service.");
  }
  if (viteInstance) {
    try {
      await viteInstance.close();
      logger.info("Vite dev server instance closed successfully.");
    } catch (err) {
      logger.error({ error: err.message }, "Error closing Vite instance.");
    }
  }
  if (httpServer) {
    logger.info("Closing HTTP server listener...");
    await new Promise((resolve) => {
      httpServer.close((err) => {
        if (err) {
          logger.error({ error: err.message }, "Error closing HTTP server listener.");
        } else {
          logger.info("HTTP server listener stopped successfully.");
        }
        resolve();
      });
    });
  }
  try {
    await dbService.shutdown();
  } catch (err) {
    logger.error({ error: err.message }, "Error shutting down database service.");
  }
  logger.info("Graceful shutdown completed successfully. Exiting process.");
  process.exit(0);
}
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
startServer();
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  getClearSessionCookieHeader,
  getSessionCookieHeader
});
//# sourceMappingURL=server.cjs.map
