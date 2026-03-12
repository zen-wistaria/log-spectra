import cron from "node-cron";
import prisma from "@/lib/prisma";

let isSchedulerRunning = false;

/** Default timeout in seconds before an agent is considered offline. */
const DEFAULT_AGENT_TIMEOUT_SECONDS = 600; // 10 minutes

/**
 * Parse the agent timeout from the AGENT_TIMEOUT env var.
 * Returns the value in *milliseconds*.
 * Falls back to DEFAULT_AGENT_TIMEOUT_SECONDS if unset or invalid.
 */
function getAgentTimeoutMs(): number {
  const raw = process.env.AGENT_TIMEOUT;
  if (!raw) return DEFAULT_AGENT_TIMEOUT_SECONDS * 1000;

  const parsed = Number(raw);
  if (Number.isNaN(parsed) || parsed <= 0) {
    console.warn(
      `[CRON] Invalid AGENT_TIMEOUT="${raw}", using default ${DEFAULT_AGENT_TIMEOUT_SECONDS}s`,
    );
    return DEFAULT_AGENT_TIMEOUT_SECONDS * 1000;
  }

  return parsed * 1000;
}

/**
 * Agent Online/Offline Status Checker
 *
 * Schedules a cron job that runs every minute to mark agents
 * whose last heartbeat exceeds the configured timeout as "offline".
 *
 * Uses a single `updateMany` query instead of fetching + looping
 * for better performance and reduced database round-trips.
 */
export function checkAgentStatus() {
  if (isSchedulerRunning) {
    console.info("[CRON] Agent status check scheduler is already running");
    return;
  }

  isSchedulerRunning = true;
  console.info("[CRON] Agent status check scheduler started");

  // Run every minute: checks all "online" agents and marks stale ones "offline"
  cron.schedule("*/1 * * * *", async () => {
    try {
      const timeoutMs = getAgentTimeoutMs();
      const cutoff = new Date(Date.now() - timeoutMs);

      // Single query: mark all online agents whose last_seen is older
      // than the cutoff (or null) as offline
      const result = await prisma.agent.updateMany({
        where: {
          status: "online",
          OR: [{ last_seen: { lt: cutoff } }, { last_seen: null }],
        },
        data: {
          status: "offline",
        },
      });

      if (result.count > 0) {
        console.info(
          `[CRON] Marked ${result.count} agent(s) as offline (timeout: ${timeoutMs / 1000}s, cutoff: ${cutoff.toISOString()})`,
        );
      }
    } catch (error) {
      console.error("[CRON] Agent status check failed:", error);
    }
  });
}

/**
 * Stop the scheduler (for graceful shutdown)
 */
export function stopAgentStatusCheckScheduler() {
  isSchedulerRunning = false;
}
