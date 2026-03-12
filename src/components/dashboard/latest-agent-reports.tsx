"use client";

import {
  Activity,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/utils";

interface Agent {
  name: string;
  hostname: string | null;
  ip_address: string | null;
}

interface ReportEntry {
  id: number;
  ip: string;
  risk_score: number;
  risk_category: string;
  request_count: number;
  error_count: number;
  created_at: string;
  agent: Agent;
}

function getRiskBadgeClass(category: string): string {
  const c = category?.toUpperCase();
  if (c === "HIGH") return "bg-red-500/10 text-red-500";
  if (c === "MEDIUM") return "bg-yellow-500/10 text-yellow-500";
  return "bg-green-500/10 text-green-500";
}

function getRiskRowClass(category: string) {
  switch (category) {
    case "HIGH":
      return "bg-red-500/10 hover:bg-red-500/15 dark:bg-red-500/10 dark:hover:bg-red-500/20";
    case "MEDIUM":
      return "bg-yellow-500/10 hover:bg-yellow-500/15 dark:bg-yellow-500/10 dark:hover:bg-yellow-500/20";
    default:
      return "bg-green-500/5 hover:bg-green-500/10 dark:bg-green-500/5 dark:hover:bg-green-500/10";
  }
}

export function LatestAgentReports() {
  const [reports, setReports] = useState<ReportEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/reports")
      .then((r) => r.json())
      .then((json) => {
        if (json.status === "ok") setReports(json.data ?? []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-blue-500" />
          Latest Agent Reports
        </CardTitle>
        <CardDescription>
          10 most recent analysis reports from agents
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: skeleton
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : reports.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No reports available yet.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agent</TableHead>
                <TableHead>Hostname</TableHead>
                <TableHead>Server IP</TableHead>
                <TableHead>Reported IP</TableHead>
                <TableHead className="text-right">Requests</TableHead>
                <TableHead className="text-right">Errors</TableHead>
                <TableHead>Risk</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((report) => {
                const low = report.risk_category.toLowerCase() === "low";
                const medium = report.risk_category.toLowerCase() === "medium";
                const high = report.risk_category.toLowerCase() === "high";
                return (
                  <TableRow
                    key={report.id}
                    className={getRiskRowClass(report.risk_category)}
                  >
                    <TableCell className="text-xs font-medium">
                      {report.agent.name}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {report.agent.hostname ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {report.agent.ip_address ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs font-mono">
                      {report.ip}
                    </TableCell>
                    <TableCell className="text-xs text-right">
                      {report.request_count.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-xs text-right">
                      {report.error_count.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-xs">
                      <Badge
                        variant={
                          low
                            ? "green-subtle"
                            : medium
                              ? "yellow-subtle"
                              : high
                                ? "red-subtle"
                                : "gray-subtle"
                        }
                        className="gap-1"
                      >
                        {low ? (
                          <ShieldCheck className="text-green-500" />
                        ) : medium ? (
                          <AlertTriangle className="text-yellow-500" />
                        ) : high ? (
                          <ShieldAlert className="text-red-500" />
                        ) : (
                          ""
                        )}
                        <div className="text-[10px]">
                          {report.risk_category}
                        </div>
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDateTime(report.created_at)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
