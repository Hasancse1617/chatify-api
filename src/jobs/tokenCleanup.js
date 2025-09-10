import { cleanupExpiredTokens } from "../lib/authTokens.js";
import cron from "node-cron";

// Run daily at 2 AM
export function startTokenCleanupJob() {
  cron.schedule("0 2 * * *", async () => {
    try {
      console.log("Starting token cleanup job...");
      const result = await cleanupExpiredTokens();
      console.log(`Token cleanup completed. Deleted ${result.deletedCount} tokens.`);
    } catch (error) {
      console.error("Token cleanup failed:", error);
    }
  });
}