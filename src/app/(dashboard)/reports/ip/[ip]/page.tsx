import {
  ArrowLeft,
  Building,
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
              <Card key={log.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex justify-between items-start gap-2">
                    <span>Agent: {log.agent.name}</span>
                    <ThreadResolveButton
                      ip={decodedIp}
                      agentId={log.agent_id}
                      agentName={log.agent.name}
                      resolvedMark={log.resolved_mark}
                      resolvedNotes={log.resolved_notes}
                    />
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    Risk Category:
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
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm">
                    <span className="font-semibold mr-1">Risk Score:</span>
                    {log.risk_score}%
                  </div>
                  <div className="text-sm flex gap-4">
                    <div>
                      <span className="font-semibold mr-1">Requests:</span>
                      {log.request_count}
                    </div>
                    <div>
                      <span className="font-semibold mr-1">Errors:</span>
                      {log.error_count}
                    </div>
                  </div>
                  <div className="text-sm flex gap-4">
                    <div>
                      <span className="font-semibold mr-1">Req/sec:</span>
                      {log.request_per_second}
                    </div>
                    <div>
                      <span className="font-semibold mr-1">
                        Endpoint Ratio:
                      </span>
                      {log.unique_endpoint_ratio}
                    </div>
                  </div>
                  <div className="text-sm">
                    <span className="font-semibold mr-1">Status:</span>
                    {log.resolved_mark ? (
                      <span className="text-green-600 font-medium">
                        Resolved
                      </span>
                    ) : (
                      <span className="text-yellow-600 font-medium">
                        Unresolved
                      </span>
                    )}
                  </div>
                  <div className="text-sm">
                    <span className="font-semibold mr-1">Reasons:</span>
                    <span className="text-muted-foreground">
                      {Array.isArray(log.risk_reasons)
                        ? log.risk_reasons.join(", ")
                        : String(log.risk_reasons || "None")}
                    </span>
                  </div>
                  {log.resolved_mark && log.resolved_notes && (
                    <div className="text-sm mt-2 p-2 bg-muted rounded-md border">
                      <span className="font-semibold text-xs uppercase tracking-wider text-muted-foreground block mb-1">
                        Resolution Notes:
                      </span>
                      {log.resolved_notes}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
