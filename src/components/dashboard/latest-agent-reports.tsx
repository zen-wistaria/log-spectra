"use client";

import { Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { dummyAgentReports, formatDate } from "@/lib/dummy-data";

export function LatestAgentReports() {
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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Agent</TableHead>
              <TableHead>Hostname</TableHead>
              <TableHead>Server IP</TableHead>
              <TableHead className="text-right">Logs</TableHead>
              <TableHead className="text-right">Anomalies</TableHead>
              <TableHead>Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dummyAgentReports.map((report, idx) => (
              <TableRow key={`${report.agent_id}-${report.created_at}-${idx}`}>
                <TableCell className="font-mono text-sm">
                  {report.agent_id}
                </TableCell>
                <TableCell>{report.hostname}</TableCell>
                <TableCell className="font-mono text-sm text-muted-foreground">
                  {report.ip_server}
                </TableCell>
                <TableCell className="text-right">
                  {report.total_logs.toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  <Badge
                    variant="secondary"
                    className={
                      report.anomalies_detected > 20
                        ? "bg-red-500/10 text-red-500"
                        : report.anomalies_detected > 10
                          ? "bg-yellow-500/10 text-yellow-500"
                          : "bg-green-500/10 text-green-500"
                    }
                  >
                    {report.anomalies_detected}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDate(report.created_at)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
