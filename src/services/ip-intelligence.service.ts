import fs from "node:fs";
import path from "node:path";
import {
  type Asn,
  type City,
  type Country,
  Reader,
} from "@maxmind/geoip2-node";
import type { AbuseIpDbResult } from "@/lib/abuseipdb";

// Re-export shared types for convenience (server-only consumers)
export type { AbuseIpDbReport, AbuseIpDbResult } from "@/lib/abuseipdb";
export { getAbuseCategoryName } from "@/lib/abuseipdb";

// ─── GeoIP types ─────────────────────────────────────────────

export interface GeoIpResult {
  city: City | null;
  country: Country | null;
  asn: Asn | null;
}

// ─── Singleton readers (cache mmdb in memory) ────────────────

let cityReader: ReturnType<typeof Reader.openBuffer> | null = null;
let countryReader: ReturnType<typeof Reader.openBuffer> | null = null;
let asnReader: ReturnType<typeof Reader.openBuffer> | null = null;

function getReader(filename: string) {
  const dbPath = path.join(process.cwd(), "data", filename);
  if (!fs.existsSync(dbPath)) return null;
  return Reader.openBuffer(fs.readFileSync(dbPath));
}

function getCityReader() {
  if (!cityReader) cityReader = getReader("GeoLite2-City.mmdb");
  return cityReader;
}

function getCountryReader() {
  if (!countryReader) countryReader = getReader("GeoLite2-Country.mmdb");
  return countryReader;
}

function getAsnReader() {
  if (!asnReader) asnReader = getReader("GeoLite2-ASN.mmdb");
  return asnReader;
}

// ─── GeoIP lookup ────────────────────────────────────────────

export function lookupGeoIp(ip: string): GeoIpResult {
  const result: GeoIpResult = { city: null, country: null, asn: null };

  try {
    const reader = getCityReader();
    if (reader) result.city = reader.city(ip);
  } catch (e) {
    console.error("GeoIP City lookup error:", e);
  }

  try {
    const reader = getCountryReader();
    if (reader) result.country = reader.country(ip);
  } catch (e) {
    console.error("GeoIP Country lookup error:", e);
  }

  try {
    const reader = getAsnReader();
    if (reader) result.asn = reader.asn(ip);
  } catch (e) {
    console.error("GeoIP ASN lookup error:", e);
  }

  return result;
}

// ─── AbuseIPDB lookup ────────────────────────────────────────

export async function lookupAbuseIpDb(
  ip: string,
): Promise<AbuseIpDbResult | null> {
  const apiKey = process.env.ABUSEIPDB_API_KEY;
  if (!apiKey) {
    console.warn("ABUSEIPDB_API_KEY not configured, skipping AbuseIPDB lookup");
    return null;
  }

  try {
    const params = new URLSearchParams({
      ipAddress: ip,
      maxAgeInDays: "90",
      verbose: "",
    });

    const res = await fetch(
      `https://api.abuseipdb.com/api/v2/check?${params.toString()}`,
      {
        headers: {
          Key: apiKey,
          Accept: "application/json",
        },
        next: { revalidate: 3600 }, // cache for 1 hour
      },
    );

    if (!res.ok) {
      console.error(`AbuseIPDB API error: ${res.status} ${res.statusText}`);
      return null;
    }

    const json = await res.json();
    return json.data as AbuseIpDbResult;
  } catch (e) {
    console.error("AbuseIPDB lookup error:", e);
    return null;
  }
}
