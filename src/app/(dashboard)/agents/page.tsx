import type { Metadata } from "next";
import { Suspense } from "react";
import { DataTableFallback } from "@/components/data-tables/data-table-fallback";
import { ErrorBoundary } from "@/components/error-boundary";
import TableLoading from "@/components/table-loading";
import { getRuntimeConfig } from "@/lib/runtime-config";
import AgentCreateButton from "./_components/agent-button-create";
import { AgentsTable } from "./_components/agent-tables";

export async function generateMetadata(): Promise<Metadata> {
  const config = getRuntimeConfig();
  return {
    title: `Agents | ${config.appName}`,
    description: "Monitor connected agents and their status",
  };
}

export default function AgentsPage() {
  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
      <ErrorBoundary fallback={<DataTableFallback />}>
        <Suspense fallback={<TableLoading />}>
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Agents</h2>
              <p className="text-muted-foreground">
                Monitor all connected agents and their current status.
              </p>
            </div>
            <AgentCreateButton />
          </div>
          <AgentsTable />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
