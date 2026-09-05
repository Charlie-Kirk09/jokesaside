import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { logger } from "./logger";
import { AppError } from "./error";

// Store in-memory CSRF tokens mapped to session or temporary IP

/**
 * Middleware to generate a unique correlation ID for every incoming request.
 */
export function correlationIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const correlationId = (req.headers["x-correlation-id"] as string) || crypto.randomUUID();
  req.headers["x-correlation-id"] = correlationId;
  res.setHeader("X-Correlation-Id", correlationId);
  next();
}

/**
 * Audit log helper for security-sensitive actions.
 */
export function logAuditEvent(
  action: string,
  meta: { email?: string; ip: string; status: "success" | "failure" | "lockout"; correlationId?: string; [key: string]: any }
) {
  logger.info(
    {
      audit: true,
      action,
      ...meta,
      timestamp: new Date().toISOString(),
    },
    `AUDIT EVENT [${action.toUpperCase()}]: ${meta.email || "anonymous"} from ${meta.ip} - Status: ${meta.status}`
  );
}

/**
 * CSRF protection middleware using double-submit cookie pattern with same-origin and localhost support.
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  const isHttps = req.secure || req.headers["x-forwarded-proto"] === "https";
  const cookieSameSite = isHttps ? "None" : "Lax";
  const secureFlag = isHttps ? "; Secure" : "";

  // Skip CSRF check for safe methods
  const safeMethods = ["GET", "HEAD", "OPTIONS"];
  if (safeMethods.includes(req.method)) {
    // If GET and there's no CSRF cookie, set one
    let existingCsrf = "";
    if (req.headers.cookie) {
      const cookies = req.headers.cookie.split(";").map(c => c.trim());
      const cookie = cookies.find(c => c.startsWith("csrf_token="));
      if (cookie) {
        existingCsrf = cookie.substring("csrf_token=".length);
      }
    }

    if (!existingCsrf) {
      const newToken = crypto.randomBytes(24).toString("hex");
      // Note: we let JS read this cookie so it can send it in headers
      res.setHeader("Set-Cookie", `csrf_token=${newToken}; Path=/; SameSite=${cookieSameSite}${secureFlag}; Max-Age=86400`);
    }
    return next();
  }

  // 1. Authorization header (Bearer token) requests are immune to browser CSRF
  const authHeader = req.headers["authorization"];
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return next();
  }

  // 2. Identify local or same-origin requests
  const host = (req.headers["x-forwarded-host"] as string) || (req.headers["host"] as string) || "";
  const origin = (req.headers["origin"] as string) || "";
  const referer = (req.headers["referer"] as string) || "";

  const isLocal =
    host.includes("localhost") ||
    host.includes("127.0.0.1") ||
    origin.includes("localhost") ||
    origin.includes("127.0.0.1") ||
    process.env.NODE_ENV !== "production";

  if (origin) {
    try {
      const originHost = new URL(origin).host;
      if (originHost === host || (isLocal && (originHost.includes("localhost") || originHost.includes("127.0.0.1")))) {
        return next();
      }
    } catch (e) {}
  }

  if (referer) {
    try {
      const refererHost = new URL(referer).host;
      if (refererHost === host || (isLocal && (refererHost.includes("localhost") || refererHost.includes("127.0.0.1")))) {
        return next();
      }
    } catch (e) {}
  }

  // In local development / localhost, allow state changes if cookie flags prevent standard browser storage
  if (isLocal) {
    return next();
  }

  // 3. Retrieve CSRF token from header and cookie
  let cookieToken = "";
  if (req.headers.cookie) {
    const cookies = req.headers.cookie.split(";").map(c => c.trim());
    const cookie = cookies.find(c => c.startsWith("csrf_token="));
    if (cookie) {
      cookieToken = cookie.substring("csrf_token=".length);
    }
  }

  const headerToken = req.headers["x-csrf-token"] as string;

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    logger.warn(
      {
        ip: req.ip || "unknown",
        method: req.method,
        path: req.path,
        cookieTokenExists: !!cookieToken,
        headerTokenExists: !!headerToken,
      },
      "CSRF verification failed!"
    );
    throw new AppError("CSRF verification failed. Request untrusted.", 403, "CSRF_VERIFICATION_FAILED");
  }

  next();
}

/**
 * Account Lockout logic
 */
export class AccountLockoutService {
  private static LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes
  private static MAX_FAILURES = 5;

  /**
   * Check if a user account is locked. Throws AppError if locked.
   */
  public static checkLockout(user: any) {
    if (!user) return;
    const now = Date.now();
    if (user.lockedUntil && user.lockedUntil > now) {
      const remainingMin = Math.ceil((user.lockedUntil - now) / 60000);
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
  public static handleFailure(user: any): boolean {
    if (!user) return false;
    user.loginFailures = (user.loginFailures || 0) + 1;
    if (user.loginFailures >= this.MAX_FAILURES) {
      user.lockedUntil = Date.now() + this.LOCK_DURATION_MS;
      logger.warn(
        { email: user.email, failures: user.loginFailures },
        "Account locked out due to consecutive login failures."
      );
      return true; // Newly locked out
    }
    return false;
  }

  /**
   * Handle a successful login attempt. Resets failure counters.
   */
  public static handleSuccess(user: any) {
    if (!user) return;
    user.loginFailures = 0;
    user.lockedUntil = 0;
  }
}
