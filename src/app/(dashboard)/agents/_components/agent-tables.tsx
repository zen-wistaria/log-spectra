"use client";

import { Server } from "lucide-react";
import { parseAsInteger, useQueryState } from "nuqs";
import { useState } from "react";
import { DataTable } from "@/components/data-tables/server-side/data-table";
import Modal from "@/components/modal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAgents } from "@/query/agent.query";
import type { GetAgentsParams } from "@/services/agent.service";
import { getColumns } from "./agent-columns";
import AgentCreateForm from "./agent-form-create";

export function AgentsTable() {
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

  const handleParamsChange = (newParams: GetAgentsParams) => {
    setPage(newParams.page);
    setLimit(newParams.limit);
    setSearch(newParams.search);
    setSort(newParams.sort);
  };

  const tableParams: GetAgentsParams = {
    page,
    limit,
    search,
    sort,
  };
  const handleCreateNew = () => {
    setIsAddModalOpen(true);
  };
  const { data, isPending } = useAgents(tableParams);
  return (
    <div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Connected Agents
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
            searchPlaceholder="Search ID or name.."
            defaultHiddenColumns={{ description: false, updated_at: false }}
            defaultSorting={[{ id: "created_at", desc: true }]}
            enableSearch={true}
            enableColumnToggle={true}
            emptyStateTitle="No agent found"
            emptyStateDescription="Create your first agent."
            onCreateNew={handleCreateNew}
            createButtonText="Create Agent"
          />
        </CardContent>
      </Card>
      <Modal
        title="New Agent"
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      >
        <AgentCreateForm onSuccess={() => setIsAddModalOpen(false)} />
      </Modal>
    </div>
  );
}
