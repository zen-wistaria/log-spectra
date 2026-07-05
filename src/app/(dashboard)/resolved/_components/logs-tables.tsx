"use client";

import type { Agents } from "@prisma/client";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAsyncSelect } from "@/hooks/use-async-select";
import { useDebounce } from "@/hooks/use-debounce";
import { useAgents } from "@/query/agent.query";
import { useResolvedAnomalies } from "@/query/anomaly.query";
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
  const [category, setCategory] = useQueryState("category", {
    defaultValue: "",
  });

  const handleParamsChange = (newParams: GetAnomaliesParams) => {
    setPage(newParams.page);
    setLimit(newParams.limit);
    setSearch(newParams.search);
    setSort(newParams.sort);
    setCategory(newParams.category || "");
  };

  const tableParams: GetAnomaliesParams = {
    page,
    limit,
    search,
    sort,
    agentId,
    category,
  };
  const { data, isPending } = useResolvedAnomalies(tableParams);

  // TODO: Add Access
  const [agentSearch, setAgentSearch] = useState("");
  const [debounceAgent] = useDebounce(agentSearch, 300);
  const agentQuery = useAgents({
    page: 1,
    limit: 10,
    search: debounceAgent,
    sort: "",
  });
  const agentSelect = useAsyncSelect<Agents>(agentId, agentQuery);
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
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 mb-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Resolved IP</CardDescription>
              <CardTitle className="text-3xl">
                {data.highCount + data.mediumCount + data.lowCount}
              </CardTitle>
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
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="w-full max-w-sm">
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
                  setPage(1);
                }}
              />
            </div>
            <div className="w-full sm:max-w-[200px]">
              <Select
                value={category || "all"}
                onValueChange={(val) => {
                  setCategory(val === "all" ? "" : val);
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="HIGH">High Risk</SelectItem>
                  <SelectItem value="MEDIUM">Medium Risk</SelectItem>
                  <SelectItem value="LOW">Low Risk</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
              request_count: false,
              error_count: false,
              avg_response_size: false,
              response_size_std: false,
              error_rate: false,
              unique_endpoint_ratio: false,
              avg_url_length: false,
              request_per_second: false,
            }}
            defaultSorting={[{ id: "resolved_at", desc: true }]}
            enableSearch={true}
            enableColumnToggle={true}
            emptyStateTitle="No resolved threats found"
            emptyStateDescription="try to resolve threats first in reports"
            rowClassName={(row) => getRiskRowClass(row.risk_category)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
