"use client";

import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { TooltipProps } from "recharts";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  NameType,
  ValueType,
} from "recharts/types/component/DefaultTooltipContent";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/dummy-data";

interface TopIpEntry {
  ip: string;
  risk_score: number;
  risk_category: string;
  request_count: number;
  error_count: number;
  updated_at: string;
}

function getRiskBadgeClass(category: string): string {
  const c = category?.toUpperCase();
  if (c === "HIGH") return "bg-red-500/10 text-red-500";
  if (c === "MEDIUM") return "bg-yellow-500/10 text-yellow-500";
  return "bg-green-500/10 text-green-500";
}

function getBarColor(score: number): string {
  if (score >= 70) return "hsl(0, 84%, 60%)";
  if (score >= 30) return "hsl(45, 93%, 47%)";
  return "hsl(142, 71%, 45%)";
}

function getRiskLabel(score: number): string {
  if (score >= 70) return "HIGH";
  if (score >= 30) return "MEDIUM";
  return "LOW";
}

function CustomBarTooltip({
  active,
  payload,
}: TooltipProps<ValueType, NameType>) {
  if (!active || !payload?.length) return null;

  const data = payload[0]?.payload;
  const score = data?.score ?? 0;
  const riskLabel = getRiskLabel(score);
  const barColor = getBarColor(score);

  return (
    <div className="rounded-lg border border-border/50 bg-popover px-3 py-2.5 text-popover-foreground shadow-xl">
      <p className="mb-1.5 text-sm font-semibold">{data?.full_ip}</p>
      <div className="flex items-center gap-2">
        <span
          className="inline-block size-2.5 rounded-sm"
          style={{ backgroundColor: barColor }}
        />
        <span className="text-xs text-muted-foreground">Risk Score</span>
        <span className="ml-auto font-mono text-xs font-medium tabular-nums">
          {Number(score).toFixed(1)}%
        </span>
      </div>
      <div className="mt-1 flex items-center gap-2">
        <span
          className="inline-block size-2.5 rounded-sm"
          style={{ backgroundColor: "transparent" }}
        />
        <span className="text-xs text-muted-foreground">Category</span>
        <span
          className="ml-auto text-xs font-semibold"
          style={{ color: barColor }}
        >
          {riskLabel}
        </span>
      </div>
    </div>
  );
}

export function TopSuspiciousIp() {
  const [topIps, setTopIps] = useState<TopIpEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((json) => {
        if (json.status === "ok") setTopIps(json.top_ips ?? []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const chartData = topIps.map((entry) => ({
    ip: entry.ip.length > 15 ? `${entry.ip.slice(0, 15)}…` : entry.ip,
    full_ip: entry.ip,
    score: Number.parseFloat(entry.risk_score.toFixed(1)),
  }));

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Top 10 Suspicious IPs
            </CardTitle>
            <CardDescription>
              IPs ranked by risk score from agent analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center">
              <Skeleton className="w-full h-full" />
            </div>
          </CardContent>
        </Card>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (topIps.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Top 10 Suspicious IPs
          </CardTitle>
          <CardDescription>
            IPs ranked by risk score from agent analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground py-8 text-center">
            No suspicious IPs detected yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Top 10 Suspicious IPs
          </CardTitle>
          <CardDescription>
            IPs ranked by risk score from agent analysis (
            {topIps[0]?.risk_category?.toUpperCase()} risk)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ left: 10, right: 20, top: 5, bottom: 5 }}
              >
                <CartesianGrid
                  horizontal={false}
                  strokeDasharray="3 3"
                  className="stroke-border/40"
                />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  className="text-xs fill-muted-foreground"
                  tickFormatter={(v) => `${v}%`}
                />
                <YAxis
                  type="category"
                  dataKey="ip"
                  width={130}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  className="text-xs fill-muted-foreground"
                />
                <Tooltip
                  cursor={{ fill: "var(--color-muted)", opacity: 0.5 }}
                  content={<CustomBarTooltip />}
                />
                <Bar dataKey="score" radius={[0, 6, 6, 0]} barSize={20}>
                  {chartData.map((entry) => (
                    <Cell key={entry.full_ip} fill={getBarColor(entry.score)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Cards grid — top 5 */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {topIps.slice(0, 5).map((entry, idx) => (
          <Card key={idx} className="relative overflow-hidden">
            <Link href={`/reports/${entry.ip}`}>
              <CardContent className="p-4">
                <p className="mb-1 font-mono text-sm font-semibold truncate">
                  {entry.ip}
                </p>
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs text-muted-foreground">
                    {entry.request_count.toLocaleString()} reqs
                  </span>
                  <Badge
                    variant="secondary"
                    className={getRiskBadgeClass(entry.risk_category)}
                  >
                    {entry.risk_score.toFixed(1)}%
                  </Badge>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {formatDate(entry.updated_at)}
                </p>
              </CardContent>
            </Link>
          </Card>
        ))}
      </div>
    </div>
  );
}
