import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getRuntimeConfig } from "@/lib/runtime-config";
import { lookupGeoIp } from "@/services/ip-intelligence.service";
import { LogAnalyzerIpDetail } from "./_components/ip-detail";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ ip: string }>;
}): Promise<Metadata> {
  const config = getRuntimeConfig();
  const { ip } = await params;
  return {
    title: `IP ${ip} Details | ${config.appName}`,
    description: `Log Analyzer details for IP: ${ip}`,
  };
}

export default async function LogAnalyzerIpDetailsPage({
  params,
}: {
  params: Promise<{ ip: string }>;
}) {
  const { ip } = await params;
  const decodedIp = decodeURIComponent(ip);

  const geoResult = lookupGeoIp(decodedIp);

  // Not found in geoip is fine — we still have session data.
  // Only 404 if the IP is obviously invalid.
  const ipv4Regex = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
  const ipv6Regex = /^[0-9a-f:]+$/i;
  if (!ipv4Regex.test(decodedIp) && !ipv6Regex.test(decodedIp)) {
    notFound();
  }

  const { city, country, asn } = geoResult;

  const countryName =
    city?.country?.names?.en || country?.country?.names?.en || "Unknown";
  const countryCode =
    city?.country?.isoCode || country?.country?.isoCode || null;
  const continentName =
    city?.continent?.names?.en || country?.continent?.names?.en || "Unknown";
  const subdivisionName = city?.subdivisions?.[0]?.names?.en || null;
  const cityName = city?.city?.names?.en || null;
  const postalCode = city?.postal?.code || null;
  const latitude = city?.location?.latitude ?? null;
  const longitude = city?.location?.longitude ?? null;
  const timezone = city?.location?.timeZone || null;
  const network = city?.traits?.network || country?.traits?.network || null;
  const asnNumber = asn?.autonomousSystemNumber || null;
  const asnOrg = asn?.autonomousSystemOrganization || null;

  return (
    <LogAnalyzerIpDetail
      ip={decodedIp}
      geo={{
        countryName,
        countryCode,
        continentName,
        subdivisionName,
        cityName,
        postalCode,
        latitude,
        longitude,
        timezone,
        network,
        asnNumber,
        asnOrg,
      }}
    />
  );
}
