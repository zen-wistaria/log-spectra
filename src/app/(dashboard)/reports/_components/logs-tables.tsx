"use client";

import type { Agent } from "@prisma/client";
import { AlertTriangle, ShieldAlert, ShieldCheck } from "lucide-react";
import { parseAsInteger, useQueryState } from "nuqs";
import { useState } from "react";
import { AsyncSelect } from "@/components/async-select";
import { DataTable } from "@/components/data-tables/server-side/data-table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  const agentSelect = useAsyncSelect<Agent>(agentId, agentQuery);
  function getRiskRowClass(category: string) {
    switch (category) {
      case "HIGH":
        return "bg-red-500/10 hover:bg-red-500/15 dark:bg-red-500/10 dark:hover:bg-red-500/20";
      case "MEDIUM":
        return "bg-yellow-500/10 hover:bg-yellow-500/15 dark:bg-yellow-500/10 dark:hover:bg-yellow-500/20";
      default:
        return "bg-green-500/5 hover:bg-green-500/10 dark:bg-green-500/5 dark:hover:bg-green-500/10";
    }
  }

  return (
    <div>
      {/* Summary Cards */}
      {data && (
        <div className="grid gap-4 md:grid-cols-4 mb-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Reported IPs</CardDescription>
              <CardTitle className="text-3xl">{data.total}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-red-500/30">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <ShieldAlert className="size-3.5 text-red-500" />
                High Risk
              </CardDescription>
              <CardTitle className="text-3xl text-red-500">
                {data.highCount}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-yellow-500/30">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <AlertTriangle className="size-3.5 text-yellow-500" />
                Medium Risk
              </CardDescription>
              <CardTitle className="text-3xl text-yellow-500">
                {data.mediumCount}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-green-500/30">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <ShieldCheck className="size-3.5 text-green-500" />
                Low Risk
              </CardDescription>
              <CardTitle className="text-3xl text-green-500">
                {data.lowCount}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
      )}
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
              placeholderSearch="Try typing your keyboard for search..."
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
              agent_id: false,
            }}
            defaultSorting={[{ id: "updated_at", desc: true }]}
            enableSearch={true}
            enableColumnToggle={true}
            emptyStateTitle="No reports logs found"
            emptyStateDescription="try to create agent first then use in your web server"
            rowClassName={(row) => getRiskRowClass(row.risk_category)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
