"use client";

import { Users as UsersIcon } from "lucide-react";
import { parseAsInteger, useQueryState } from "nuqs";
import { DataTable } from "@/components/data-tables/server-side/data-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUsers } from "@/query/user.query";
import type { GetUsersParams } from "@/services/user.service";
import { getColumns } from "./user-columns";

export function UsersTable() {
  const columns = getColumns();
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
  const [limit, setLimit] = useQueryState("limit", {
    defaultValue: 10,
    parse: (value) => {
      const num = Number(value);
      if (Number.isNaN(num) || num <= 0) return 10;
      return Math.min(num, 50);
    },
  });
  const [search, setSearch] = useQueryState("search", { defaultValue: "" });
  const [sort, setSort] = useQueryState("sort", { defaultValue: "" });

  const handleParamsChange = (newParams: GetUsersParams) => {
    setPage(newParams.page);
    setLimit(newParams.limit);
    setSearch(newParams.search);
    if (newParams.sort) setSort(newParams.sort);
  };

  const tableParams: GetUsersParams = {
    page,
    limit,
    search,
    sort: sort || "",
  };

  const { data, isPending } = useUsers(tableParams);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UsersIcon className="h-5 w-5" />
          Registered Users
        </CardTitle>
      </CardHeader>
      <CardContent>
        <DataTable
          columns={columns}
          data={data?.data || []}
          totalCount={data?.total || 0}
          pageCount={data?.pages || 1}
          loading={isPending}
          params={tableParams}
          onParamsChange={handleParamsChange}
          searchPlaceholder="Search name, username, email.."
          defaultHiddenColumns={{ id: false }}
          defaultSorting={[{ id: "createdAt", desc: true }]}
          enableSearch={true}
          enableColumnToggle={true}
          emptyStateTitle="No user found"
          emptyStateDescription="Create your first user."
        />
      </CardContent>
    </Card>
  );
}
