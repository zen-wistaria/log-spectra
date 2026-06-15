import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { auth } from "@/auth";
import { DataTableFallback } from "@/components/data-tables/data-table-fallback";
import { ErrorBoundary } from "@/components/error-boundary";
import TableLoading from "@/components/table-loading";
import { getRuntimeConfig } from "@/lib/runtime-config";
import UserCreateButton from "./_components/user-button-create";
import { UsersTable } from "./_components/user-tables";

export async function generateMetadata(): Promise<Metadata> {
  const config = getRuntimeConfig();
  return {
    title: `Users | ${config.appName}`,
    description: "Manage system administrators and viewers",
  };
}

export default async function UsersPage() {
  const session = await auth();
  if (session?.user.role !== "admin") {
    redirect("/executive");
  }

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
      <ErrorBoundary fallback={<DataTableFallback />}>
        <Suspense fallback={<TableLoading />}>
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Users</h2>
              <p className="text-muted-foreground">
                Manage administrators and viewers access.
              </p>
            </div>
            <UserCreateButton />
          </div>
          <UsersTable />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
