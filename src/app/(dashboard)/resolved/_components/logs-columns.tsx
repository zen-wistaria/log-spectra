"use client";

import type { Agent, AnomalyLog } from "@prisma/client";
import type { ColumnDef } from "@tanstack/react-table";
import { AlertTriangle, ShieldAlert, ShieldCheck } from "lucide-react";
// import type { GroupedAnomalyItem } from "@/actions/anomalies";
import { DataTableColumnHeader } from "@/components/data-tables/data-table-column-header";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";
import CellActions from "./logs-cell-actions";

export type IColumns = AnomalyLog & {
  agent: Agent;
};

export const getColumns = (): ColumnDef<IColumns>[] => [
  {
    id: "resolved_at",
    accessorKey: "resolved_at",
    meta: {
      label: "Resolved At",
    },
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Resolved At"
        disableColumnHide={false}
      />
    ),
    cell: ({ row }) => (
      <span className="text-xs">
        {formatDateTime(String(row.original.resolved_at))}
      </span>
    ),
    enableHiding: true,
  },
  {
    id: "ip",
    accessorKey: "ip",
    meta: {
      label: "Reported IP",
    },
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Reported IP"
        disableColumnHide={true}
      />
    ),
    enableSorting: true,
    cell: ({ row }) => {
      const low = row.original.risk_category.toLowerCase() === "low";
      const medium = row.original.risk_category.toLowerCase() === "medium";
      const high = row.original.risk_category.toLowerCase() === "high";
      return (
        <Badge
          variant={
            low
              ? "green-subtle"
              : medium
                ? "yellow-subtle"
                : high
                  ? "red-subtle"
                  : "gray-subtle"
          }
        >
          <div className="font-mono">{row.original.ip}</div>
        </Badge>
      );
    },
    enableHiding: false,
  },
  {
    id: "agents",
    accessorKey: "agents",
    meta: {
      label: "Agents",
    },
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Agents"
        disableColumnHide={false}
      />
    ),
    cell: ({ row }) => (
      <div className="text-xs font-mono flex flex-col">
        {row.original.agent.name}
        <span className="text-muted-foreground text-[10px]">
          {row.original.agent.id}
        </span>
      </div>
    ),
    enableHiding: true,
    enableSorting: true,
  },
  {
    id: "resolved_notes",
    accessorKey: "resolved_notes",
    meta: {
      label: "Resolved Notes",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Resolved Notes" />
    ),
    cell: ({ row }) => {
      if (!row.original.resolved_notes) return null;
      const reason = row.original.resolved_notes;
      return <span className="text-xs">{reason}</span>;
    },
  },
  {
    id: "request_count",
    accessorKey: "request_count",
    meta: {
      label: "Request Count",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Request Count" />
    ),
    cell: ({ row }) => (
      <div className="text-xs">{row.original.request_count}</div>
    ),
  },
  {
    id: "error_count",
    accessorKey: "error_count",
    meta: {
      label: "Error Count",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Error Count" />
    ),
    cell: ({ row }) => (
      <div className="text-xs">{row.original.error_count}</div>
    ),
  },
  {
    id: "request_per_second",
    accessorKey: "request_per_second",
    meta: {
      label: "Requests/sec",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Requests/sec" />
    ),
    cell: ({ row }) => (
      <div className="text-xs">{row.original.request_per_second} r/s</div>
    ),
  },
  {
    id: "unique_endpoint_ratio",
    accessorKey: "unique_endpoint_ratio",
    meta: {
      label: "Endpoint Ratio",
    },
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Endpoint Ratio"
        disableColumnHide={true}
      />
    ),
    cell: ({ row }) => (
      <div className="text-xs">{row.original.unique_endpoint_ratio}</div>
    ),
    enableHiding: false,
  },
  {
    id: "risk_score",
    accessorKey: "risk_score",
    meta: {
      label: "Risk Score",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Risk Score" />
    ),
    cell: ({ row }) => {
      const low = row.original.risk_category.toLowerCase() === "low";
      const medium = row.original.risk_category.toLowerCase() === "medium";
      const high = row.original.risk_category.toLowerCase() === "high";
      return (
        <Badge
          variant={
            low
              ? "green-subtle"
              : medium
                ? "yellow-subtle"
                : high
                  ? "red-subtle"
                  : "gray-subtle"
          }
        >
          <div className="text-xs">{row.original.risk_score}%</div>
        </Badge>
      );
    },
  },
  {
    id: "risk_category",
    accessorKey: "risk_category",
    meta: {
      label: "Risk Category",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Risk Category" />
    ),
    cell: ({ row }) => {
      const low = row.original.risk_category.toLowerCase() === "low";
      const medium = row.original.risk_category.toLowerCase() === "medium";
      const high = row.original.risk_category.toLowerCase() === "high";
      return (
        <Badge
          variant={
            low
              ? "green-subtle"
              : medium
                ? "yellow-subtle"
                : high
                  ? "red-subtle"
                  : "gray-subtle"
          }
        >
          {low ? (
            <ShieldCheck className="text-green-500" />
          ) : medium ? (
            <AlertTriangle className="text-yellow-500" />
          ) : high ? (
            <ShieldAlert className="text-red-500" />
          ) : (
            ""
          )}
          <div className="text-[10px]">{row.original.risk_category}</div>
        </Badge>
      );
    },
  },
  {
    id: "risk_reasons",
    accessorKey: "risk_reasons",
    meta: {
      label: "Risk Reasons",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Risk Reasons" />
    ),
    cell: ({ row }) => {
      if (!row.original.risk_reasons) return null;
      const reason = row.original.risk_reasons.toString().split(",");
      return (
        <span className="text-muted-foreground text-xs">
          {reason.join(", ")}
        </span>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => <CellActions row={row.original} />,
  },
];
