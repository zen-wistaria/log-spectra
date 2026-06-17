import { Activity, ShieldAlert, ShieldCheck, Target } from "lucide-react";
import type { Metadata } from "next";
import { TopSuspiciousIp } from "@/components/dashboard/top-suspicious-ip";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Separator } from "@/components/ui/separator";
import prisma from "@/lib/prisma";
import { getRuntimeConfig } from "@/lib/runtime-config";
import { AnomalyService } from "@/services/anomaly.service";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const config = getRuntimeConfig();
  return {
    title: `Executive Security Report | ${config.appName}`,
    description: "Executive server log anomaly detection dashboard",
  };
}

export default async function ExecutiveDashboardPage() {
  const stats = await AnomalyService.getDashboardStats();

  const [highCount, mediumCount, lowCount] = await Promise.all([
    AnomalyService.countRiskCategory({
      riskCategory: "HIGH",
      markedAsResolved: false,
    }),
    AnomalyService.countRiskCategory({
      riskCategory: "MEDIUM",
      markedAsResolved: false,
    }),
    AnomalyService.countRiskCategory({
      riskCategory: "LOW",
      markedAsResolved: false,
    }),
  ]);

  const totalUnresolved = highCount + mediumCount + lowCount;
  const resolutionRate =
    stats.totalLogs > 0
      ? ((stats.totalMarkedAsResolved / stats.totalLogs) * 100).toFixed(1)
      : "100";

  const hasCritical = stats.highRiskIps > 0;

  const agents = await prisma.agents.findMany({
    select: { name: true, description: true, status: true },
  });

  const onlineAgents = agents.filter((agent) => agent.status === "online");
  const offlineAgents = agents.filter((agent) => agent.status === "offline");

  return (
    <div className="flex flex-col gap-6 py-4 md:gap-8 md:py-6 px-4 lg:px-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Executive Security Report
          </h2>
          <p className="text-muted-foreground mt-1">
            High-level overview of infrastructure security posture and threat
            metrics.
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          Report generated on {new Date().toLocaleString()}
        </div>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-card p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-4 text-muted-foreground">
            {!hasCritical ? (
              <ShieldCheck className="size-5 text-green-500" />
            ) : (
              <ShieldAlert className="size-5 text-yellow-500" />
            )}
            <span className="text-sm font-medium uppercase tracking-wider">
              Security Posture
            </span>
          </div>
          <div>
            <div
              className={`text-3xl font-black ${
                !hasCritical ? "text-green-500" : "text-yellow-500"
              }`}
            >
              {!hasCritical ? "STABLE" : "ELEVATED RISK"}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              {!hasCritical
                ? "No active critical threats"
                : "Critical anomalies require attention"}
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-4 text-muted-foreground">
            <Target className="size-5" />
            <span className="text-sm font-medium uppercase tracking-wider">
              Resolution Rate
            </span>
          </div>
          <div>
            <div className="text-3xl font-black">{resolutionRate}%</div>
            <div className="text-sm text-muted-foreground mt-1">
              {stats.totalMarkedAsResolved.toLocaleString()} of{" "}
              {stats.totalLogs.toLocaleString()} threats resolved
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-4 text-muted-foreground">
            <Activity className="size-5 text-red-500" />
            <span className="text-sm font-medium uppercase tracking-wider text-red-500">
              Active Critical Threats
            </span>
          </div>
          <div>
            <div className="text-3xl font-black text-red-500">
              {stats.highRiskIps.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              Unresolved HIGH risk IPs
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-4 text-muted-foreground">
            <Globe className="size-5" />
            <span className="text-sm font-medium uppercase tracking-wider">
              Endpoint Coverage
            </span>
          </div>
          <div>
            <div className="text-3xl font-black">
              {stats.totalAgents > 0
                ? Math.round((stats.activeAgents / stats.totalAgents) * 100)
                : 0}
              %
            </div>
            <HoverCard>
              <HoverCardTrigger asChild>
                <div className="text-sm text-muted-foreground mt-1 cursor-help underline decoration-dotted underline-offset-2 w-max">
                  {stats.activeAgents} of {stats.totalAgents} agents online
                </div>
              </HoverCardTrigger>
              <HoverCardContent align="start" className="w-72">
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold border-b pb-2">
                    Online Agents
                  </h4>
                  <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto pr-2">
                    {onlineAgents.length === 0 ? (
                      <span className="text-sm text-muted-foreground italic">
                        No agents currently online
                      </span>
                    ) : (
                      onlineAgents.map((a, i) => (
                        <div key={i} className="flex flex-col">
                          <span className="text-sm font-medium text-foreground">
                            {a.name}
                          </span>
                          {a.description && (
                            <span className="text-xs text-muted-foreground">
                              {a.description}
                            </span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
                <Separator className="border-b my-4 bg-muted" />
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold border-b pb-2">
                    Offline Agents
                  </h4>
                  <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto pr-2">
                    {offlineAgents.length === 0 ? (
                      <span className="text-sm text-muted-foreground italic">
                        No agents currently offline
                      </span>
                    ) : (
                      offlineAgents.map((a, i) => (
                        <div key={i} className="flex flex-col">
                          <span className="text-sm font-medium text-foreground">
                            {a.name}
                          </span>
                          {a.description && (
                            <span className="text-xs text-muted-foreground">
                              {a.description}
                            </span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </HoverCardContent>
            </HoverCard>
          </div>
        </div>
      </div>

      {/* Threat Distribution Analysis */}
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <h3 className="text-lg font-bold mb-4">Active Threat Distribution</h3>
        {totalUnresolved === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            No active threats at the moment.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-24 text-sm font-semibold text-red-500">
                HIGH
              </div>
              <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-500 rounded-full"
                  style={{ width: `${(highCount / totalUnresolved) * 100}%` }}
                />
              </div>
              <div className="w-12 text-sm text-right font-medium">
                {highCount}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-24 text-sm font-semibold text-yellow-500">
                MEDIUM
              </div>
              <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-yellow-500 rounded-full"
                  style={{ width: `${(mediumCount / totalUnresolved) * 100}%` }}
                />
              </div>
              <div className="w-12 text-sm text-right font-medium">
                {mediumCount}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-24 text-sm font-semibold text-green-500">
                LOW
              </div>
              <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full"
                  style={{ width: `${(lowCount / totalUnresolved) * 100}%` }}
                />
              </div>
              <div className="w-12 text-sm text-right font-medium">
                {lowCount}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Actionable Intelligence */}
      <div className="pt-4">
        <h3 className="text-xl font-bold mb-4">Top Critical Threat Origins</h3>
        <TopSuspiciousIp />
      </div>
    </div>
  );
}

// Dummy Globe component since it was removed from imports previously
function Globe(props: React.ComponentProps<"svg">) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
      <path d="M2 12h20" />
    </svg>
  );
}
