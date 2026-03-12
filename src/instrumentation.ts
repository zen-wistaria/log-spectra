/**
 * Next.js Instrumentation
 * This file runs once when the server starts.
 * Used to initialize background tasks like cron jobs.
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  // Only run on Node.js runtime (not Edge or during build)
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Dynamic import to avoid Edge runtime issues with Node.js modules
    const { checkAgentStatus } = await import("@/lib/scheduler");
    checkAgentStatus();
  }
}
