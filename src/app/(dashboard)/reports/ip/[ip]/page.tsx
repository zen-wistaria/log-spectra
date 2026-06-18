import {
  ArrowLeft,
  Building,
  Clock,
  Database,
  Globe,
  MapPin,
  Network,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import prisma from "@/lib/prisma";
import { getRuntimeConfig } from "@/lib/runtime-config";
import { lookupGeoIp } from "@/services/ip-intelligence.service";
import { AbuseIpDbSection } from "./_components/abuseipdb-section";
import { IpActionButtons } from "./_components/ip-actions";
import { ThreadResolveButton } from "./_components/thread-resolve-button";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ ip: string }>;
}): Promise<Metadata> {
  const config = getRuntimeConfig();
  const { ip } = await params;
  return {
    title: `IP ${ip} Details | ${config.appName}`,
    description: `View all analyzed log entries from agent for IP: ${ip}`,
  };
}

export default async function IpDetailsPage({
  params,
}: {
  params: Promise<{ ip: string }>;
}) {
  const { ip } = await params;
  const decodedIp = decodeURIComponent(ip);

  const dbLogs = await prisma.anomalyLogs.findMany({
    where: { ip: decodedIp },
    include: { agent: true },
  });

  if (dbLogs.length === 0) {
    notFound();
  }

  const { city, country, asn } = lookupGeoIp(decodedIp);

  // Derive display values from mmdb data
  const countryName =
    city?.country?.names?.en || country?.country?.names?.en || "Unknown";
  const countryCode =
    city?.country?.isoCode || country?.country?.isoCode || null;
  const continentName =
    city?.continent?.names?.en || country?.continent?.names?.en || "Unknown";
  const subdivisionName = city?.subdivisions?.[0]?.names?.en || null;
  const cityName = city?.city?.names?.en || null;
  const postalCode = city?.postal?.code || null;
  const latitude = city?.location?.latitude;
  const longitude = city?.location?.longitude;
  const timezone = city?.location?.timeZone || null;
  const network = city?.traits?.network || country?.traits?.network || null;
  const asnNumber = asn?.autonomousSystemNumber || null;
  const asnOrg = asn?.autonomousSystemOrganization || null;

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/reports">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold tracking-tight">IP Details</h2>
          <p className="text-muted-foreground">
            Intelligence report for{" "}
            <span className="font-mono font-semibold text-foreground">
              {decodedIp}
            </span>
          </p>
        </div>
        <IpActionButtons ip={decodedIp} />
      </div>

      {/* GeoIP Intelligence Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Location */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <Globe className="size-3.5 text-muted-foreground" />
              Location
            </CardDescription>
            <CardTitle className="text-xl">{countryName}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {countryCode && (
              <div className="text-sm text-muted-foreground">
                Code: <span className="font-mono">{countryCode}</span>
              </div>
            )}
            {subdivisionName && (
              <div className="text-sm text-muted-foreground">
                Region: {subdivisionName}
              </div>
            )}
            {cityName && (
              <div className="text-sm text-muted-foreground">
                City: {cityName}
              </div>
            )}
            <div className="text-sm text-muted-foreground">
              Continent: {continentName}
            </div>
          </CardContent>
        </Card>

        {/* Coordinates */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <MapPin className="size-3.5 text-muted-foreground" />
              Coordinates
            </CardDescription>
            <CardTitle className="text-xl">
              {latitude != null ? `${latitude}, ${longitude}` : "N/A"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {timezone && (
              <div className="text-sm text-muted-foreground">
                Timezone: {timezone}
              </div>
            )}
            {postalCode && (
              <div className="text-sm text-muted-foreground">
                Postal: {postalCode}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Network / ASN */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <Network className="size-3.5 text-muted-foreground" />
              ASN & Network
            </CardDescription>
            <CardTitle className="text-xl">
              {asnNumber ? `AS${asnNumber}` : "Unknown"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {asnOrg && (
              <div className="text-sm text-muted-foreground">{asnOrg}</div>
            )}
            {network && (
              <div className="text-sm text-muted-foreground">
                Network: <span className="font-mono">{network}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Organization */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <Building className="size-3.5 text-muted-foreground" />
              Organization
            </CardDescription>
            <CardTitle className="text-xl truncate">
              {asnOrg || "Unknown"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {asnNumber && (
              <div className="text-sm text-muted-foreground">
                ASN: <span className="font-mono">AS{asnNumber}</span>
              </div>
            )}
            {network && (
              <div className="text-sm text-muted-foreground">
                Prefix: <span className="font-mono">{network}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* AbuseIPDB Section — client component, loads on button click */}
      <AbuseIpDbSection ip={decodedIp} />

      {/* Threat Details */}
      <div className="mt-2">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Database className="size-5" /> Threat Details
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {dbLogs.map((log) => {
            const low = log.risk_category.toLowerCase() === "low";
            const medium = log.risk_category.toLowerCase() === "medium";
            const high = log.risk_category.toLowerCase() === "high";

            return (
              <Card key={log.id} className="flex flex-col h-full">
                <CardHeader className="pb-4 border-b">
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-1 overflow-hidden">
                      <CardTitle className="text-lg flex items-center gap-2 truncate">
                        <Database className="size-4 text-muted-foreground shrink-0" />
                        <span className="truncate" title={log.agent.name}>
                          {log.agent.name}
                        </span>
                      </CardTitle>
                      <CardDescription className="space-y-1.5 mt-2">
                        <div className="flex flex-col gap-1 text-xs">
                          <div className="flex items-start gap-2">
                            <span className="font-semibold w-16 shrink-0">
                              ID:
                            </span>
                            <span className="font-mono text-muted-foreground break-all">
                              {log.agent.id}
                            </span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="font-semibold w-16 shrink-0">
                              Host:
                            </span>
                            <span
                              className="text-muted-foreground truncate"
                              title={log.agent.hostname || "N/A"}
                            >
                              {log.agent.hostname || "N/A"}
                            </span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="font-semibold w-16 shrink-0">
                              Desc:
                            </span>
                            <span
                              className="text-muted-foreground line-clamp-2 break-all"
                              title={log.agent.description || "No description"}
                            >
                              {log.agent.description || "No description"}
                            </span>
                          </div>
                        </div>
                      </CardDescription>
                    </div>
                    <div className="shrink-0">
                      <ThreadResolveButton
                        ip={decodedIp}
                        agentId={log.agent_id}
                        agentName={log.agent.name}
                        resolvedMark={log.resolved_mark}
                        resolvedNotes={log.resolved_notes}
                      />
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 pt-4 flex-1 flex flex-col">
                  <div className="flex flex-col items-start gap-2">
                    <span className="font-semibold shrink-0 text-muted-foreground">
                      Agent Reported
                    </span>
                    <span className="font-mono break-all text-lg">
                      {log.ip}
                    </span>
                  </div>
                  {/* Risk Badge and Score */}
                  <div className="flex items-center justify-between pb-1">
                    <div className="space-y-1">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Category
                      </span>
                      <div>
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
                        >
                          {log.risk_category}
                        </Badge>
                      </div>
                    </div>
                    <div className="space-y-1 text-right">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Risk Score
                      </span>
                      <div
                        className={`text-xl font-bold ${high ? "text-red-500" : medium ? "text-yellow-500" : low ? "text-green-500" : ""}`}
                      >
                        {log.risk_score}%
                      </div>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-y-4 gap-x-2 bg-muted/40 p-3 rounded-lg border">
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-0.5">
                        Requests
                      </span>
                      <div className="font-mono text-sm">
                        {log.request_count}
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-0.5">
                        Errors
                      </span>
                      <div className="font-mono text-sm">{log.error_count}</div>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-0.5">
                        Req/Sec
                      </span>
                      <div className="font-mono text-sm">
                        {log.request_per_second}
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-0.5">
                        Unique Endpoint
                      </span>
                      <div className="font-mono text-sm">
                        {log.unique_endpoint_ratio}
                      </div>
                    </div>
                  </div>

                  {/* Status & Reasons */}
                  <div className="space-y-3 flex-1 flex flex-col">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold">
                        Resolution Status:
                      </span>
                      {log.resolved_mark ? (
                        <Badge
                          variant="outline"
                          className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800"
                        >
                          Resolved
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-400 dark:border-yellow-800"
                        >
                          Unresolved
                        </Badge>
                      )}
                    </div>

                    <div className="flex-1">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                        Reasons
                      </span>
                      <p className="text-sm text-foreground/80 bg-muted/20 p-2.5 rounded-md border min-h-[60px]">
                        {Array.isArray(log.risk_reasons)
                          ? log.risk_reasons.join(", ")
                          : String(log.risk_reasons || "None")}
                      </p>
                    </div>

                    {log.resolved_mark && log.resolved_notes && (
                      <div className="text-sm p-3 bg-muted/50 rounded-md border border-l-4 border-l-green-500">
                        <span className="font-semibold text-xs uppercase tracking-wider text-muted-foreground block mb-1">
                          Resolution Notes:
                        </span>
                        <p className="text-foreground/80 italic">
                          "{log.resolved_notes}"
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="text-[10px] mt-auto text-muted-foreground/70 text-right pt-2 flex items-center justify-end gap-1.5">
                    <Clock className="size-3" />
                    Reported at {new Date(log.updated_at).toLocaleString()}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
