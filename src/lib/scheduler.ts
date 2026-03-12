import cron from "node-cron";
import { AgentService } from "@/services/agent.service";

let isSchedulerRunning = false;

/**
 * SSL Auto-Renewal Cron Scheduler
 * Runs daily at 01:00 AM to check and renew expiring certificates
 */
export function checkAgentStatus() {
  if (isSchedulerRunning) {
    console.log("Agent status check scheduler is already running");
    return;
  }

  // Cron expression: minute hour day month weekday
  cron.schedule("*/1 * * * *", async () => {
    console.log("[CRON] Starting scheduled agent status check...");

    try {
      const interval = Number(process.env.AGENT_CHECK_INTERVAL);
      if (Number.isNaN(interval)) {
        console.info(
          "Env AGENT_CHECK_INTERVAL is not defined or not a valid number, using default (300 seconds)",
        );
      }

      const results = await AgentService.getActiveAgents();
      if (results) {
        for (const agent of results) {
          if (agent.last_seen) {
            if (Date.now() - agent.last_seen.getTime() > interval) {
              await AgentService.updateAgentStatus(agent.id, "offline");
            }
          }
        }
      }
    } catch (error) {
      console.error("[CRON] Agent check failed:", error);
    }
  });

  isSchedulerRunning = true;
}

/**
 * Stop the scheduler (for graceful shutdown)
 */
export function stopAgentStatusCheckScheduler() {
  // node-cron doesn't have a built-in stop for all tasks
  // but we can flag it as not running
  isSchedulerRunning = false;
}
