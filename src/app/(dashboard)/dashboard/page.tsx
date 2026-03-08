import type { Metadata } from "next";
import { LatestAgentReports } from "@/components/dashboard/latest-agent-reports";
import { TopSuspiciousIp } from "@/components/dashboard/top-suspicious-ip";

export const metadata: Metadata = {
  title: "Dashboard — LogGuard",
  description: "Server log anomaly detection dashboard",
};

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
      <div className="space-y-8">
        {/* Summary cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard title="Total Logs" value="176,040" delta="+12.4%" />
          <SummaryCard title="Active Agents" value="4" delta="of 5" />
          <SummaryCard
            title="Anomalies Detected"
            value="234"
            delta="+8.1%"
            variant="danger"
          />
          <SummaryCard title="High Risk IPs" value="7" delta="-2 from last" />
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
  variant?: "default" | "danger";
}) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <p className="text-sm text-muted-foreground">{title}</p>
      <p
        className={`mt-1 text-2xl font-bold tracking-tight ${variant === "danger" ? "text-red-500" : ""}`}
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{delta}</p>
    </div>
  );
}
