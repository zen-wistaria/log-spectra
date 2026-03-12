import type { Metadata } from "next";
import { Suspense } from "react";
import { DataTableFallback } from "@/components/data-tables/data-table-fallback";
import { ErrorBoundary } from "@/components/error-boundary";
import TableLoading from "@/components/table-loading";
import { LogsTable } from "./_components/logs-tables";

export const metadata: Metadata = {
  title: "Log Analysis — LogGuard",
  description: "View all analyzed log entries from agents",
};

export default function AnomaliesLogsPage() {
  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
      <ErrorBoundary fallback={<DataTableFallback />}>
        <Suspense fallback={<TableLoading />}>
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">
                Report Log Analysis
              </h2>
              <p className="text-muted-foreground">
                All log entries analyzed by agents with anomaly detection
                results.
              </p>
            </div>
          </div>
          <LogsTable />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
