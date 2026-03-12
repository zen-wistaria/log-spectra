"use client";

import { parseAsInteger, useQueryState } from "nuqs";
import { useState } from "react";
import { DataTable } from "@/components/data-tables/server-side/data-table";
import Modal from "@/components/modal";
import { Card, CardContent } from "@/components/ui/card";
import { useTokens } from "@/query/token.query";
import type { GetTokenParams } from "@/services/token.service";
import { getColumns } from "./token-columns";
import TokenCreateForm from "./token-form-create";

export function TokensTable({ agentId }: { agentId: string }) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const columns = getColumns();
  // Params
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

  const handleParamsChange = (newParams: GetTokenParams) => {
    setPage(newParams.page);
    setLimit(newParams.limit);
    setSearch(newParams.search);
    setSort(newParams.sort);
  };

  const tableParams: GetTokenParams = {
    page,
    limit,
    search,
    sort,
    agentId,
  };

  const { data, isPending } = useTokens({
    agentId,
    ...tableParams,
  });

  const handleCreateNew = () => {
    setIsAddModalOpen(true);
  };

  return (
    <div>
      <Card>
        <CardContent>
          <DataTable
            columns={columns}
            data={data?.data || []}
            totalCount={data?.total || 0}
            pageCount={data?.pages || 1}
            loading={isPending}
            params={tableParams}
            onParamsChange={handleParamsChange}
            searchPlaceholder="Search token.."
            defaultHiddenColumns={{ id: false, updated_at: false }}
            defaultSorting={[{ id: "created_at", desc: true }]}
            enableSearch={true}
            enableColumnToggle={true}
            emptyStateTitle="No tokens found"
            emptyStateDescription="Create your first tokens."
            onCreateNew={handleCreateNew}
            createButtonText="Create Tokens"
          />
        </CardContent>
      </Card>
      <Modal
        title="New Token"
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      >
        <TokenCreateForm
          agentId={agentId}
          onSuccess={() => setIsAddModalOpen(false)}
        />
      </Modal>
    </div>
  );
}
