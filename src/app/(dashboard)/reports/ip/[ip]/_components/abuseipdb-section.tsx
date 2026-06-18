"use client";

import {
  AlertTriangle,
  Clock,
  ExternalLink,
  Loader2,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Wifi,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { type AbuseIpDbResult, getAbuseCategoryName } from "@/lib/abuseipdb";
import { useAbuseIpDbCheck } from "@/query/ip-intelligence.query";

// ─── Score display helpers ───────────────────────────────────

function getScoreColor(score: number): string {
  if (score >= 75) return "text-red-500";
  if (score >= 50) return "text-orange-500";
  if (score >= 25) return "text-yellow-500";
  return "text-green-500";
}

function getScoreBg(score: number): string {
  if (score >= 75) return "bg-red-500";
  if (score >= 50) return "bg-orange-500";
  if (score >= 25) return "bg-yellow-500";
  return "bg-green-500";
}

function getScoreLabel(score: number): string {
  if (score >= 75) return "High Risk";
  if (score >= 50) return "Moderate Risk";
  if (score >= 25) return "Low Risk";
  return "Clean";
}

// ─── Main component ─────────────────────────────────────────

export function AbuseIpDbSection({ ip }: { ip: string }) {
  const [enabled, setEnabled] = useState(false);
  const { data, isPending, isError, error } = useAbuseIpDbCheck(ip, enabled);

  // Initial state — show the check button
  if (!enabled) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="size-5 text-muted-foreground" />
                IP Reputation — AbuseIPDB
              </CardTitle>
              <CardDescription className="mt-1">
                Check the reputation of <span className="font-mono">{ip}</span>{" "}
                against AbuseIPDB community reports.
              </CardDescription>
            </div>
            <Button onClick={() => setEnabled(true)}>
              <Shield className="size-4 mr-2" />
              Check Reputation
            </Button>
          </div>
        </CardHeader>
      </Card>
    );
  }

  // Loading state
  if (isPending) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
            Checking AbuseIPDB...
          </CardTitle>
          <CardDescription>
            Fetching reputation data for <span className="font-mono">{ip}</span>
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Error state
  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="size-5 text-red-500" />
            AbuseIPDB Check Failed
          </CardTitle>
          <CardDescription>
            {error?.message || "Could not retrieve reputation data."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" size="sm" onClick={() => setEnabled(false)}>
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  // No data returned (e.g. API key not configured)
  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="size-5 text-muted-foreground" />
            IP Reputation — AbuseIPDB
          </CardTitle>
          <CardDescription>
            Could not retrieve reputation data. Make sure{" "}
            <code className="text-xs font-mono bg-muted px-1 py-0.5 rounded">
              ABUSEIPDB_API_KEY
            </code>{" "}
            is configured in{" "}
            <code className="text-xs font-mono bg-muted px-1 py-0.5 rounded">
              .env
            </code>
            .
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Success — render the full reputation card
  return <AbuseIpDbResultCard data={data} ip={ip} />;
}

// ─── Result card ─────────────────────────────────────────────

function AbuseIpDbResultCard({
  data,
  ip,
}: {
  data: AbuseIpDbResult;
  ip: string;
}) {
  const score = data.abuseConfidenceScore;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              {score >= 50 ? (
                <ShieldAlert className="size-5 text-red-500" />
              ) : (
                <ShieldCheck className="size-5 text-green-500" />
              )}
              IP Reputation — AbuseIPDB
            </CardTitle>
            <CardDescription className="mt-1">
              Abuse confidence score and community reports for{" "}
              <span className="font-mono">{ip}</span>
            </CardDescription>
          </div>
          <Link
            href={`https://www.abuseipdb.com/check/${ip}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" size="sm">
              <ExternalLink className="size-3.5 mr-1.5" />
              View on AbuseIPDB
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Score Section */}
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-center gap-1">
            <div
              className={`text-4xl font-black tabular-nums ${getScoreColor(score)}`}
            >
              {score}%
            </div>
            <Badge
              variant="secondary"
              className={`${getScoreBg(score)} text-white`}
            >
              {getScoreLabel(score)}
            </Badge>
          </div>

          {/* Progress bar */}
          <div className="flex-1 space-y-2">
            <div className="text-sm font-medium">Abuse Confidence Score</div>
            <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${getScoreBg(score)}`}
                style={{ width: `${score}%` }}
              />
            </div>
            <div className="text-xs text-muted-foreground">
              0% = no risk · 100% = confirmed malicious
            </div>
          </div>
        </div>

        {/* Metadata Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <MetaItem label="ISP" value={data.isp || "Unknown"} />
          <MetaItem label="Domain" value={data.domain || "N/A"} />
          <MetaItem label="Usage Type" value={data.usageType || "N/A"} />
          <MetaItem label="Total Reports" value={String(data.totalReports)} />
          <MetaItem
            label="Distinct Users"
            value={String(data.numDistinctUsers)}
          />
          <MetaItem label="IP Version" value={`IPv${data.ipVersion}`} />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {data.isWhitelisted && (
            <Badge variant="green-subtle">Whitelisted</Badge>
          )}
          {data.isTor && <Badge variant="red-subtle">Tor Exit Node</Badge>}
          {data.hostnames.length > 0 && (
            <div className="text-xs text-muted-foreground">
              Hostnames: {data.hostnames.join(", ")}
            </div>
          )}
        </div>

        {data.lastReportedAt && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Clock className="size-3.5" />
            Last reported: {new Date(data.lastReportedAt).toLocaleString()}
          </div>
        )}

        {/* Recent Reports */}
        {data.reports.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-1.5">
              <AlertTriangle className="size-4 text-yellow-500" />
              Recent Reports ({data.reports.length})
            </h4>
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {data.reports.map((report, idx) => (
                <div
                  key={`${report.reportedAt}-${report.reporterId}-${idx}`}
                  className="rounded-lg border bg-muted/40 p-3 space-y-2"
                >
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Wifi className="size-3" />
                      {report.reporterCountryName} ({report.reporterCountryCode}
                      )
                    </span>
                    <span>
                      {new Date(report.reportedAt).toLocaleDateString()}
                    </span>
                  </div>
                  {report.comment && (
                    <p className="text-sm text-foreground/80 font-mono break-all">
                      {report.comment}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1">
                    {report.categories.map((catId) => (
                      <Badge
                        key={catId}
                        variant="secondary"
                        className="text-[10px]"
                      >
                        {getAbuseCategoryName(catId)}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-medium truncate">{value}</div>
    </div>
  );
}
