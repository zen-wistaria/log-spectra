"use client";

import type { Agent } from "@prisma/client";
import { parseAsInteger, useQueryState } from "nuqs";
import { useState } from "react";
import { AsyncSelect } from "@/components/async-select";
import { DataTable } from "@/components/data-tables/server-side/data-table";
import { Card, CardContent } from "@/components/ui/card";
import { useAsyncSelect } from "@/hooks/use-async-select";
import { useDebounce } from "@/hooks/use-debounce";
import { useAgents } from "@/query/agent.query";
import { useAnomalies } from "@/query/anomaly.query";
import type { GetAnomaliesParams } from "@/services/anomaly.service";
import { getColumns } from "./logs-columns";

export function LogsTable() {
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
  const [agentId, setAgentId] = useQueryState("agentId", { defaultValue: "" });

  const handleParamsChange = (newParams: GetAnomaliesParams) => {
    setPage(newParams.page);
    setLimit(newParams.limit);
    setSearch(newParams.search);
    setSort(newParams.sort);
  };

  const tableParams: GetAnomaliesParams = {
    page,
    limit,
    search,
    sort,
    agentId,
  };
  const { data, isPending } = useAnomalies(tableParams);

  // TODO: Add Access
  const [agentSearch, setAgentSearch] = useState("");
  const [debounceAgent] = useDebounce(agentSearch, 300);
  const agentQuery = useAgents({
    page: 1,
    limit: 10,
    search: debounceAgent,
    sort: "",
  });
  const agentSelect = useAsyncSelect<Agent>(null, agentQuery);

  return (
    <div>
      <Card>
        <CardContent>
          <div className="max-w-sm">
            <AsyncSelect
              open={agentSelect.open}
              setOpen={agentSelect.setOpen}
              selected={agentSelect.selected}
              search={agentSearch}
              setSearch={setAgentSearch}
              isLoading={agentSelect.isLoading}
              items={agentSelect.items}
              placeholderEmptySelected="Select Agent"
              placeholderSearch="Search for more..."
              getLabel={(item) => item.name}
              onSelect={(item) => {
                agentSelect.handleSelect(item);
                setAgentId(item?.id ?? "");
              }}
            />
          </div>
          <DataTable
            columns={columns}
            data={data?.data || []}
            totalCount={data?.total || 0}
            pageCount={data?.pages || 1}
            loading={isPending}
            params={tableParams}
            onParamsChange={handleParamsChange}
            searchPlaceholder="Search..."
            defaultHiddenColumns={{
              id: false,
              "agent-ip": false,
              "agent-hostname": false,
            }}
            defaultSorting={[{ id: "updated_at", desc: true }]}
            enableSearch={true}
            enableColumnToggle={true}
            emptyStateTitle="No anomalies logs found"
            emptyStateDescription="No anomalies logs found."
          />
        </CardContent>
      </Card>
    </div>
  );
}
