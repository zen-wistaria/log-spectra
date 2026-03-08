"use client";

import { AlertTriangle } from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  dummySuspiciousIPs,
  formatDate,
  getAnomalyBgColor,
} from "@/lib/dummy-data";

const chartData = dummySuspiciousIPs.map((ip) => ({
  ip:
    ip.ip_address.length > 12
      ? `${ip.ip_address.slice(0, 12)}…`
      : ip.ip_address,
  full_ip: ip.ip_address,
  score: Number.parseFloat((ip.anomaly_score * 100).toFixed(0)),
  requests: ip.total_requests,
}));

function getBarColor(score: number): string {
  if (score >= 70) return "hsl(0, 84%, 60%)";
  if (score >= 30) return "hsl(45, 93%, 47%)";
  return "hsl(142, 71%, 45%)";
}

export function TopSuspiciousIp() {
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
            IPs ranked by anomaly score from agent analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ left: 10, right: 20 }}
              >
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  type="category"
                  dataKey="ip"
                  width={120}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "13px",
                  }}
                  formatter={(value: number | undefined) => [
                    `${value}%`,
                    "Anomaly Score",
                  ]}
                  labelFormatter={(_, payload) =>
                    payload?.[0]?.payload?.full_ip || ""
                  }
                />
                <Bar dataKey="score" radius={[0, 4, 4, 0]} barSize={18}>
                  {chartData.map((entry) => (
                    <Cell key={entry.full_ip} fill={getBarColor(entry.score)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Cards grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {dummySuspiciousIPs.slice(0, 5).map((ip) => (
          <Card key={ip.ip_address} className="relative overflow-hidden">
            <CardContent className="p-4">
              <p className="mb-1 font-mono text-sm font-semibold">
                {ip.ip_address}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {ip.total_requests.toLocaleString()} reqs
                </span>
                <Badge
                  variant="secondary"
                  className={getAnomalyBgColor(ip.anomaly_score)}
                >
                  {(ip.anomaly_score * 100).toFixed(0)}%
                </Badge>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {formatDate(ip.last_seen)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
