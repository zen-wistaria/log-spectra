import fs from "node:fs";
import path from "node:path";
import { type City, Reader } from "@maxmind/geoip2-node";
import { ArrowLeft, Database, Globe, MapPin } from "lucide-react";
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
import { IpActionButtons } from "./_components/ip-actions";

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

  let geo: City | null = null;
  try {
    const dbPath = path.join(process.cwd(), "data", "GeoLite2-City.mmdb");
    if (!fs.existsSync(dbPath)) {
      throw new Error(`GeoIP database not found at ${dbPath}`);
    }
    const dbBuffer = fs.readFileSync(dbPath);
    const reader = Reader.openBuffer(dbBuffer);
    geo = reader.city(decodedIp);
  } catch (e: unknown) {
    if (e instanceof Error && "code" in e && e.code === "ENOENT") {
      console.error(
        'GeoIP database not found. Please download GeoLite2-City.mmdb and place it in the "data" directory at the root of your project.',
      );
    } else {
      console.error("GeoIP error:", e);
    }
  }

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/reports">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold tracking-tight">IP Details</h2>
          <p className="text-muted-foreground">
            Information and related logs for IP address {decodedIp}
          </p>
        </div>
        <IpActionButtons ip={decodedIp} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-2">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Globe className="size-3.5 text-muted-foreground" />
              Location
            </CardDescription>
            <CardTitle className="text-2xl">
              {geo?.country?.names?.en || "Unknown"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              {geo?.subdivisions?.[0]?.names?.en}{" "}
              {geo?.city?.names?.en ? `- ${geo.city.names.en}` : ""}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <MapPin className="size-3.5 text-muted-foreground" />
              Coordinates
            </CardDescription>
            <CardTitle className="text-2xl">
              {geo?.location?.latitude
                ? `${geo.location.latitude}, ${geo.location.longitude}`
                : "N/A"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              Timezone: {geo?.location?.timeZone || "Unknown"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Globe className="size-3.5 text-muted-foreground" />
              Network & Postal
            </CardDescription>
            <CardTitle className="text-2xl">
              {geo?.postal?.code || "N/A"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              Network: {geo?.traits?.network || "Unknown"}
              <br />
              Continent: {geo?.continent?.names?.en || "Unknown"}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Database className="size-5" /> Threat Details
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {dbLogs.map((log) => {
            const low = log.risk_category.toLowerCase() === "low";
            const medium = log.risk_category.toLowerCase() === "medium";
            const high = log.risk_category.toLowerCase() === "high";

            return (
              <Card
                key={log.id}
                className={log.resolved_mark ? "opacity-70" : ""}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex justify-between items-center">
                    Agent: {log.agent.name}
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
                    <span className="font-semibold">Risk Score:</span>{" "}
                    {log.risk_score}%
                  </div>
                  <div className="text-sm flex gap-4">
                    <div>
                      <span className="font-semibold">Requests:</span>{" "}
                      {log.request_count}
                    </div>
                    <div>
                      <span className="font-semibold">Errors:</span>{" "}
                      {log.error_count}
                    </div>
                  </div>
                  <div className="text-sm flex gap-4">
                    <div>
                      <span className="font-semibold">Req/sec:</span>{" "}
                      {log.request_per_second}
                    </div>
                    <div>
                      <span className="font-semibold">Endpoint Ratio:</span>{" "}
                      {log.unique_endpoint_ratio}
                    </div>
                  </div>
                  <div className="text-sm">
                    <span className="font-semibold">Status:</span>{" "}
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
                    <span className="font-semibold">Reasons:</span>{" "}
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
