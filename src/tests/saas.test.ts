import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import crypto from "crypto";
import fs from "fs";
import path from "path";

// Import modules under test
import { logger } from "../server/logger";
import { BackupService } from "../server/backup";
import { MigrationManager, DbState } from "../server/migration";
import { AppError, errorHandler } from "../server/error";
import { AccountLockoutService, csrfProtection } from "../server/security";
import { MonitoringService } from "../server/monitoring";

// Mock PBKDF2 Hashing helpers from server.ts for test isolation
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash || !storedHash.includes(":")) return false;
  const [salt, hash] = storedHash.split(":");
  const testHash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return hash === testHash;
}

// Full deep sanitization check to reject malformed parameters or scripts
function sanitizeValue(value: any): any {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") {
    if (value.length > 5000) {
      throw new AppError("Input payload text exceeds safe lengths limit.", 400, "BAD_REQUEST_SIZE");
    }
    let clean = value.replace(/<[^>]*>/gi, "");
    clean = clean.replace(/javascript\s*:/gi, "");
    clean = clean.replace(/on\w+\s*=/gi, "");
    return clean;
  } else if (Array.isArray(value)) {
    if (value.length > 100) {
      throw new AppError("Input array exceeds safe collection bounds.", 400, "BAD_REQUEST_ARRAY_SIZE");
    }
    return value.map(item => sanitizeValue(item));
  } else if (typeof value === "object") {
    const cleanObj: Record<string, any> = {};
    for (const [key, val] of Object.entries(value)) {
      if (key.length > 120 || key.includes("__proto__") || key === "constructor" || key === "prototype") {
        throw new AppError("Inadmissible request parameter key.", 400, "BAD_REQUEST_PROTOTYPE_POLLUTION");
      }
      cleanObj[key] = sanitizeValue(val);
    }
    return cleanObj;
  }
  return value;
}

describe("1. Password Hashing & Validation Unit Tests", () => {
  it("should generate salt-separated hashes for a password", () => {
    const password = "StrongPassword123!";
    const hashed = hashPassword(password);
    expect(hashed).toContain(":");
    const parts = hashed.split(":");
    expect(parts.length).toBe(2);
    expect(parts[0].length).toBe(32); // Hex representation of 16-bytes salt
  });

  it("should successfully verify valid passwords and reject invalid ones", () => {
    const password = "StrongPassword123!";
    const hashed = hashPassword(password);
    expect(verifyPassword(password, hashed)).toBe(true);
    expect(verifyPassword("WrongPassword!", hashed)).toBe(false);
  });
});

describe("2. Account Lockout Protection Unit Tests", () => {
  let mockUser: any;

  beforeEach(() => {
    mockUser = {
      email: "student@uniinfo.edu",
      loginFailures: 0,
      lockedUntil: 0,
    };
  });

  it("should not throw lockout error on initialization", () => {
    expect(() => AccountLockoutService.checkLockout(mockUser)).not.toThrow();
  });

  it("should lock account after 5 consecutive login failures", () => {
    // 4 consecutive failures
    for (let i = 0; i < 4; i++) {
      const isLocked = AccountLockoutService.handleFailure(mockUser);
      expect(isLocked).toBe(false);
      expect(mockUser.loginFailures).toBe(i + 1);
    }

    // 5th failure
    const isLockedOn5th = AccountLockoutService.handleFailure(mockUser);
    expect(isLockedOn5th).toBe(true);
    expect(mockUser.loginFailures).toBe(5);
    expect(mockUser.lockedUntil).toBeGreaterThan(Date.now());

    // checkLockout should now throw a 423 Account Locked error
    expect(() => AccountLockoutService.checkLockout(mockUser)).toThrowError(
      /Account is locked due to consecutive login failures/
    );
  });

  it("should reset login failures counter on successful authentication", () => {
    mockUser.loginFailures = 3;
    AccountLockoutService.handleSuccess(mockUser);
    expect(mockUser.loginFailures).toBe(0);
    expect(mockUser.lockedUntil).toBe(0);
  });
});

describe("3. Durable Backup Service Unit Tests", () => {
  const backupDir = path.join(process.cwd(), "backups");

  it("should list available backups and return array", () => {
    const backups = BackupService.listBackups();
    expect(Array.isArray(backups)).toBe(true);
  });

  it("should fail gracefully and return false when trying to restore non-existing file", async () => {
    const success = await BackupService.restoreBackup("non_existent_file.json");
    expect(success).toBe(false);
  });
});

describe("4. Database Schema Migration Layer Unit Tests", () => {
  let mockDb: DbState;

  beforeEach(() => {
    mockDb = {
      universities: [{ id: 101, name: "Harvard University" }],
      users: [{ email: "alumni@uniinfo.com" }],
      sessions: {},
    };
  });

  it("should apply versioned migrations and update db.schemaVersion to 4", () => {
    expect(mockDb.schemaVersion).toBeUndefined();
    
    const migrated = MigrationManager.migrate(mockDb);
    expect(migrated).toBe(true);
    expect(mockDb.schemaVersion).toBe(4);

    // Verify User schema upgrades (bookmarks initialized)
    expect(mockDb.users[0].bookmarks).toEqual([]);
    expect(mockDb.users[0].loginFailures).toBe(0);
    expect(mockDb.users[0].lockedUntil).toBe(0);
    expect(mockDb.users[0].createdAt).toBeDefined();
    expect(mockDb.users[0].emailVerified).toBe(false);

    // Verify University upgrades (reviews array initialized)
    expect(mockDb.universities[0].reviews).toEqual([]);
    expect(mockDb.universities[0].rating).toBe(4.0);
  });

  it("should not apply migrations again if database schema is up-to-date", () => {
    mockDb.schemaVersion = 4;
    const migrated = MigrationManager.migrate(mockDb);
    expect(migrated).toBe(false);
  });
});

describe("5. Suspicious Payload Sanitization Unit Tests", () => {
  it("should recursively strip dangerous HTML and javascript tag blocks", () => {
    const dangerousInput = "<script>alert('hack')</script>Hello <img src='x' onerror='alert(1)'>World!";
    const clean = sanitizeValue(dangerousInput);
    expect(clean).toBe("alert('hack')Hello World!");
  });

  it("should clean javascript protocol prefixes in input parameters", () => {
    const dangerousInput = "javascript:void(0)";
    const clean = sanitizeValue(dangerousInput);
    expect(clean).toBe("void(0)");
  });

  it("should reject prototype pollution attempts", () => {
    const maliciousPayload = JSON.parse('{"__proto__": {"polluted": "true"}}');
    expect(() => sanitizeValue(maliciousPayload)).toThrowError(
      /Inadmissible request parameter key/
    );
  });

  it("should enforce text length limit restrictions", () => {
    const longString = "A".repeat(5001);
    expect(() => sanitizeValue(longString)).toThrowError(
      /Input payload text exceeds safe lengths limit/
    );
  });
});

describe("6. Standardized Error Handling Unit Tests", () => {
  let mockReq: any;
  let mockRes: any;
  let mockNext: any;

  beforeEach(() => {
    mockReq = {
      path: "/api/test",
      method: "POST",
      headers: {},
      query: {},
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    mockNext = vi.fn();
  });

  it("should capture custom AppError attributes and send correlation ID in response", () => {
    const err = new AppError("Verification failure", 401, "UNAUTHORIZED_ACCESS");
    errorHandler(err, mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: "Verification failure",
      status: "error",
      code: "UNAUTHORIZED_ACCESS",
      correlationId: "system",
    });
  });
});

describe("7. System Monitoring & Metrics Unit Tests", () => {
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      universities: [{ id: 1 }],
      users: [{ email: "test@gmail.com" }],
      sessions: { token123: {} },
    };
  });

  it("should generate full healthy healthcheck diagnostics info", async () => {
    const health = await MonitoringService.getHealthDiagnostics(mockDb);
    expect(health.status).toBe("ok");
    expect(health.uptimeSeconds).toBeGreaterThanOrEqual(0);
    expect(health.components.database.recordCounts.universities).toBe(1);
    expect(health.components.database.recordCounts.users).toBe(1);
    expect(health.components.database.recordCounts.sessions).toBe(1);
    expect(health.components.aiProviders).toBeDefined();
  });

  it("should export Prometheus metrics structure", () => {
    const mockRes: any = {
      set: vi.fn(),
      status: vi.fn().mockReturnThis(),
      send: vi.fn(),
    };
    MonitoringService.handleMetrics({} as any, mockRes, mockDb);

    expect(mockRes.set).toHaveBeenCalledWith("Content-Type", "text/plain; version=0.0.4; charset=utf-8");
    expect(mockRes.status).toHaveBeenCalledWith(200);
    
    const prometheusPayload = mockRes.send.mock.calls[0][0];
    expect(prometheusPayload).toContain("node_uptime_seconds");
    expect(prometheusPayload).toContain("db_universities_total 1");
    expect(prometheusPayload).toContain("db_users_total 1");
    expect(prometheusPayload).toContain("db_active_sessions_total 1");
  });
});
