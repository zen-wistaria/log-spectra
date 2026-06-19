"use client";

import { ArrowLeft, Database } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AbuseIpDbSection } from "@/app/(dashboard)/reports/[ip]/_components/abuseipdb-section";
import { IpActionButtons } from "@/app/(dashboard)/reports/[ip]/_components/ip-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// ── Types ─────────────────────────────────────────────────────

interface AnalysisResult {
  ip: string;
  request_count: number;
  error_count: number;
  error_rate: number;
  avg_response_size: number;
  response_size_std: number;
  avg_url_length: number;
  request_per_second: number;
  unique_endpoint_ratio: number;
  anomaly_score: number;
  model_risk_score: number;
  behavior_risk_score: number;
  risk_score: number;
  risk_category: "HIGH" | "MEDIUM" | "LOW";
  risk_reasons: string[];
}

interface GeoProps {
  countryName: string;
  countryCode: string | null;
  continentName: string;
  subdivisionName: string | null;
  cityName: string | null;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
  timezone: string | null;
  network: string | null;
  asnNumber: number | null;
  asnOrg: string | null;
}

interface Props {
  ip: string;
  geo: GeoProps;
}

// ── Helpers ───────────────────────────────────────────────────

function getRiskColor(category: string) {
  switch (category) {
    case "HIGH":
      return "text-red-500";
    case "MEDIUM":
      return "text-yellow-500";
    default:
      return "text-green-500";
  }
}

function getRiskBadgeVariant(category: string) {
  switch (category) {
    case "HIGH":
      return "red-subtle" as const;
    case "MEDIUM":
      return "yellow-subtle" as const;
    default:
      return "green-subtle" as const;
  }
}

// ── Component ─────────────────────────────────────────────────

export function LogAnalyzerIpDetail({ ip, geo }: Props) {
  const [row, setRow] = useState<AnalysisResult | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const storedResults = sessionStorage.getItem("log-analyzer-results");

    if (!storedResults) {
      setNotFound(true);
      return;
    }

    try {
      // Lookup by URL `ip`, NOT a stored selected-ip key.
      // Kalo IP di URL gak ada di dataset → 404.
      const results: AnalysisResult[] = JSON.parse(storedResults);
      const found = results.find((r) => r.ip === ip) ?? null;
      setRow(found);
      if (!found) setNotFound(true);
    } catch {
      setNotFound(true);
    }
  }, [ip]);

  if (notFound) {
    return (
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            asChild
            onClick={() => history.back()}
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">IP Not Found</h2>
            <p className="text-muted-foreground">
              No analysis data for this IP in the current session. Please
              re-analyze your log file.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!row) {
    return (
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" disabled>
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Loading...</h2>
          </div>
        </div>
      </div>
    );
  }

  const riskColor = getRiskColor(row.risk_category);

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/log-analyzer">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold tracking-tight">IP Details</h2>
          <p className="text-muted-foreground">
            Log Analyzer report for{" "}
            <span className="font-mono font-semibold text-foreground">
              {ip}
            </span>
          </p>
        </div>
        <IpActionButtons ip={ip} />
      </div>

      {/* GeoIP Intelligence Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              GeoIP Location
            </CardDescription>
            <CardTitle className="text-xl">{geo.countryName}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {geo.countryCode && (
              <div className="text-sm text-muted-foreground">
                Code: <span className="font-mono">{geo.countryCode}</span>
              </div>
            )}
            {geo.subdivisionName && (
              <div className="text-sm text-muted-foreground">
                Region: {geo.subdivisionName}
              </div>
            )}
            {geo.cityName && (
              <div className="text-sm text-muted-foreground">
                City: {geo.cityName}
              </div>
            )}
            <div className="text-sm text-muted-foreground">
              Continent: {geo.continentName}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              Coordinates
            </CardDescription>
            <CardTitle className="text-xl">
              {geo.latitude != null
                ? `${geo.latitude}, ${geo.longitude}`
                : "N/A"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {geo.timezone && (
              <div className="text-sm text-muted-foreground">
                Timezone: {geo.timezone}
              </div>
            )}
            {geo.postalCode && (
              <div className="text-sm text-muted-foreground">
                Postal: {geo.postalCode}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              ASN & Network
            </CardDescription>
            <CardTitle className="text-xl">
              {geo.asnNumber ? `AS${geo.asnNumber}` : "Unknown"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {geo.asnOrg && (
              <div className="text-sm text-muted-foreground">{geo.asnOrg}</div>
            )}
            {geo.network && (
              <div className="text-sm text-muted-foreground">
                Network: <span className="font-mono">{geo.network}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              Organization
            </CardDescription>
            <CardTitle className="text-xl truncate">
              {geo.asnOrg || "Unknown"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {geo.asnNumber && (
              <div className="text-sm text-muted-foreground">
                ASN: <span className="font-mono">AS{geo.asnNumber}</span>
              </div>
            )}
            {geo.network && (
              <div className="text-sm text-muted-foreground">
                Prefix: <span className="font-mono">{geo.network}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* AbuseIPDB Section */}
      <AbuseIpDbSection ip={ip} />

      {/* Risk Detail Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="size-5" />
            Analysis Results
          </CardTitle>
          <CardDescription>
            Per-IP analysis from uploaded log file (no database storage)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Risk summary */}
          <div className="flex items-center justify-between pb-2">
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Category
              </span>
              <div>
                <Badge variant={getRiskBadgeVariant(row.risk_category)}>
                  {row.risk_category}
                </Badge>
              </div>
            </div>
            <div className="space-y-1 text-right">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Risk Score
              </span>
              <div className={`text-xl font-bold ${riskColor}`}>
                {row.risk_score}%
              </div>
            </div>
          </div>

          {/* Score breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-muted/40 p-4 rounded-lg border">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Model Score (Isolation Forest)
              </div>
              <div className="text-2xl font-bold font-mono">
                {row.model_risk_score}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Weight: 60%
              </div>
            </div>
            <div className="bg-muted/40 p-4 rounded-lg border">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Behavior Score (Rule-based)
              </div>
              <div className="text-2xl font-bold font-mono">
                {row.behavior_risk_score}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Weight: 40%
              </div>
            </div>
          </div>

          {/* Feature details */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-4 gap-x-2 bg-muted/40 p-4 rounded-lg border">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-0.5">
                Requests
              </span>
              <div className="font-mono text-sm">
                {row.request_count.toLocaleString()}
              </div>
            </div>
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-0.5">
                Errors
              </span>
              <div className="font-mono text-sm">
                {row.error_count.toLocaleString()}
              </div>
            </div>
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-0.5">
                Req/Sec
              </span>
              <div className="font-mono text-sm">{row.request_per_second}</div>
            </div>
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-0.5">
                Unique Endpoint
              </span>
              <div className="font-mono text-sm">
                {row.unique_endpoint_ratio}
              </div>
            </div>
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-0.5">
                Error Rate
              </span>
              <div className="font-mono text-sm">
                {(row.error_rate * 100).toFixed(1)}%
              </div>
            </div>
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-0.5">
                Avg Response Size
              </span>
              <div className="font-mono text-sm">
                {row.avg_response_size.toLocaleString()}
              </div>
            </div>
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-0.5">
                Response Std
              </span>
              <div className="font-mono text-sm">
                {row.response_size_std.toLocaleString()}
              </div>
            </div>
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-0.5">
                Avg URL Length
              </span>
              <div className="font-mono text-sm">
                {row.avg_url_length.toFixed(1)}
              </div>
            </div>
          </div>

          {/* Reasons */}
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2">
              Reasons
            </span>
            <div className="text-sm text-foreground/80 bg-muted/20 p-3 rounded-md border">
              {row.risk_reasons?.join(", ") || "None"}
            </div>
          </div>

          {/* Anomaly Score (raw) */}
          <div className="text-[10px] text-muted-foreground/70 text-right pt-2">
            Raw anomaly score: {row.anomaly_score}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
