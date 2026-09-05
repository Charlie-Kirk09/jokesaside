import fs from "fs";
import path from "path";
import { logger } from "./logger";
import { dbService } from "../db/dbService";

const BACKUP_DIR = path.join(process.cwd(), "backups");
const RETENTION_DAYS = 7;

export class BackupService {
  /**
   * Ensure backup directory exists.
   */
  private static ensureBackupDir() {
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
  }

  /**
   * Run a full backup of the DB by exporting Postgres data.
   */
  public static async createBackup(reason = "automatic"): Promise<string | null> {
    try {
      this.ensureBackupDir();

      if (!dbService.isUsingPostgres()) {
        logger.warn("PostgreSQL database is offline. Cannot create database backup.");
        return null;
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const backupFilename = `db_backup_${timestamp}_${reason}.json`;
      const backupPath = path.join(BACKUP_DIR, backupFilename);

      logger.info("Exporting PostgreSQL data for database backup...");
      const exportData = await dbService.exportPostgresData();

      fs.writeFileSync(backupPath, JSON.stringify(exportData, null, 2), "utf-8");
      logger.info({ backupFilename, reason }, "PostgreSQL export backup created successfully.");

      // Run cleanup after creating a backup
      this.enforceRetention();

      return backupFilename;
    } catch (error: any) {
      logger.error({ error: error.message }, "Database backup failed.");
      return null;
    }
  }

  /**
   * List all available backups, sorted from newest to oldest.
   */
  public static listBackups() {
    try {
      this.ensureBackupDir();
      const files = fs.readdirSync(BACKUP_DIR);
      
      return files
        .filter(f => f.startsWith("db_backup_") && f.endsWith(".json"))
        .map(file => {
          const stats = fs.statSync(path.join(BACKUP_DIR, file));
          return {
            filename: file,
            createdAt: stats.mtime,
            sizeBytes: stats.size,
          };
        })
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error: any) {
      logger.error({ error: error.message }, "Failed to list backups.");
      return [];
    }
  }

  /**
   * Restore the database from a given backup filename.
   */
  public static async restoreBackup(filename: string): Promise<boolean> {
    try {
      this.ensureBackupDir();
      const backupPath = path.join(BACKUP_DIR, filename);

      if (!fs.existsSync(backupPath)) {
        logger.error({ filename }, "Specified backup file does not exist.");
        return false;
      }

      // Create pre-restore safety backup
      logger.info("Creating a pre-restore safety backup...");
      await this.createBackup("pre_restore_safety");

      logger.info({ filename }, "Restoring database from backup file...");
      const raw = fs.readFileSync(backupPath, "utf-8");
      const data = JSON.parse(raw);

      await dbService.importPostgresData(data);
      logger.info({ filename }, "Database successfully restored from backup.");
      return true;
    } catch (error: any) {
      logger.error({ error: error.message, filename }, "Restore failed.");
      return false;
    }
  }

  /**
   * Delete backups older than RETENTION_DAYS.
   */
  public static enforceRetention() {
    try {
      this.ensureBackupDir();
      const backups = this.listBackups();
      const now = new Date();
      const retentionMs = RETENTION_DAYS * 24 * 60 * 60 * 1000;

      backups.forEach(backup => {
        const ageMs = now.getTime() - backup.createdAt.getTime();
        if (ageMs > retentionMs) {
          const filePath = path.join(BACKUP_DIR, backup.filename);
          fs.unlinkSync(filePath);
          logger.info({ filename: backup.filename }, "Pruned old backup file due to retention policy.");
        }
      });
    } catch (error: any) {
      logger.error({ error: error.message }, "Error during backup retention cleanup.");
    }
  }

  private static schedulerInterval: NodeJS.Timeout | null = null;

  /**
   * Set up a background worker checking to run automated backups.
   */
  public static async startScheduler() {
    if (this.schedulerInterval) {
      logger.warn("Daily Backup Scheduler is already running.");
      return;
    }
    logger.info("Initializing Daily Backup Scheduler...");
    
    // Check if we need an initial backup (e.g., if no backups exist or if last backup is > 24 hours ago)
    const backups = this.listBackups();
    const now = new Date();
    const oneDayMs = 24 * 60 * 60 * 1000;

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

    // Schedule check every hour to see if a backup needs to be created
    this.schedulerInterval = setInterval(async () => {
      try {
        const currentBackups = this.listBackups();
        const currentDate = new Date();
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
      } catch (err: any) {
        logger.error({ error: err.message }, "Error in daily backup scheduler check.");
      }
    }, 60 * 60 * 1000); // Hourly check

    if (this.schedulerInterval && typeof this.schedulerInterval.unref === "function") {
      this.schedulerInterval.unref();
    }
  }

  /**
   * Stop the background automated backup check.
   */
  public static stopScheduler() {
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
      logger.info("Daily Backup Scheduler stopped.");
    }
  }
}
