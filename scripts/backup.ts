import dotenv from "dotenv";
dotenv.config();

import { BackupService } from "../src/server/backup";
import { logger } from "../src/server/logger";

async function runBackup() {
  logger.info("Initializing backup via CLI...");
  
  // Wait a brief moment for database service asynchronous initialization
  await new Promise((resolve) => setTimeout(resolve, 1500));
  
  const backupFilename = await BackupService.createBackup("cli_manual");
  if (backupFilename) {
    logger.info(`Backup completed successfully! Saved as: backups/${backupFilename}`);
    process.exit(0);
  } else {
    logger.error("Backup failed. Check logs for details.");
    process.exit(1);
  }
}

runBackup().catch((err) => {
  console.error("Unhandled exception during backup run:", err);
  process.exit(1);
});
