import type { Metadata } from "next";
import { Suspense } from "react";
import { DataTableFallback } from "@/components/data-tables/data-table-fallback";
import { ErrorBoundary } from "@/components/error-boundary";
import TableLoading from "@/components/table-loading";
import { getRuntimeConfig } from "@/lib/runtime-config";
import { LogsTable } from "./_components/logs-tables";

export async function generateMetadata(): Promise<Metadata> {
  const config = getRuntimeConfig();
  return {
    title: `Resolved Threats | ${config.appName}`,
    description: "View all suspicious ips marked as resolved",
  };
}

export default function AnomaliesLogsPage() {
  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
      <ErrorBoundary fallback={<DataTableFallback />}>
        <Suspense fallback={<TableLoading />}>
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">
                Resolved Threats
              </h2>
              <p className="text-muted-foreground">
                All log entries that have been marked as resolved.
              </p>
            </div>
          </div>
          <LogsTable />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
