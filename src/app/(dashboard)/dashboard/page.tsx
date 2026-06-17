import type { Metadata } from "next";
import { LatestAgentReports } from "@/components/dashboard/latest-agent-reports";
import { TopSuspiciousIp } from "@/components/dashboard/top-suspicious-ip";
import { getRuntimeConfig } from "@/lib/runtime-config";
import { AnomalyService } from "@/services/anomaly.service";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const config = getRuntimeConfig();
  return {
    title: `Dashboard | ${config.appName}`,
    description: "Server log anomaly detection dashboard",
  };
}

export default async function DashboardPage() {
  const stats = await AnomalyService.getDashboardStats();

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Overview of reporting statistics.
          </p>
        </div>
        {/* Summary cards */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
          <SummaryCard
            title="Total Reported IPs"
            value={stats.totalLogs.toLocaleString()}
            delta="from database"
          />
          <SummaryCard
            title="Active Agents"
            value={stats.activeAgents.toLocaleString()}
            delta={`of ${stats.totalAgents} agents`}
          />
          <SummaryCard
            title="High Risk IPs"
            value={stats.highRiskIps.toLocaleString()}
            delta="currently flagged HIGH"
            variant="danger"
          />
          <SummaryCard
            title="Total Agents"
            value={stats.totalAgents.toLocaleString()}
            delta={`${stats.totalAgents - stats.activeAgents} offline`}
          />
          <SummaryCard
            title="Currently in Reports"
            value={(
              stats.totalLogs - stats.totalMarkedAsResolved
            ).toLocaleString()}
            delta="Total IPs in reports"
          />
          <SummaryCard
            title="Resolved"
            value={stats.totalMarkedAsResolved.toLocaleString()}
            delta="IPs marked as resolved"
            variant="success"
          />
        </div>

        {/* Suspicious IPs */}
        <TopSuspiciousIp />

        {/* Latest reports */}
        <LatestAgentReports />
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  delta,
  variant = "default",
}: {
  title: string;
  value: string;
  delta: string;
  variant?: "default" | "danger" | "success";
}) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <p className="text-sm text-muted-foreground">{title}</p>
      <p
        className={`mt-1 text-2xl font-bold tracking-tight ${
          variant === "danger"
            ? "text-red-500"
            : variant === "success"
              ? "text-green-500"
              : ""
        }`}
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{delta}</p>
    </div>
  );
}
