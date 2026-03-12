import type { Metadata } from "next";
import { getRuntimeConfig } from "@/lib/runtime-config";
import LogAnalyzerView from "./_components/view";

export function generateMetadata(): Metadata {
  const config = getRuntimeConfig();
  return {
    title: `Log Analyzer | ${config.appName}`,
    description:
      "Upload a web server access log file to analyze IP behavior and detect anomalies.",
  };
}

export default function LogAnalyzerPage() {
  return <LogAnalyzerView />;
}
