"use client";

import type { Agent, AnomalyLog } from "@prisma/client";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/data-tables/data-table-column-header";
import { DateCell } from "@/components/data-tables/date-cell";
import { Badge } from "@/components/ui/badge";

export type IColumns = AnomalyLog & { agent: Agent };

export const getColumns = (): ColumnDef<IColumns>[] => [
  {
    id: "id",
    accessorKey: "id",
    meta: {
      label: "ID",
    },
    cell: ({ row }) => <div className="text-xs">{row.original.id}</div>,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="ID" />
    ),
    enableHiding: true,
  },
  {
    id: "updated_at",
    accessorKey: "updated_at",
    meta: {
      label: "Timestamp",
    },
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Timestamp"
        disableColumnHide={false}
      />
    ),
    cell: ({ row }) => <DateCell date={row.original.updated_at} />,
    enableHiding: true,
  },
  {
    id: "agent_id",
    accessorKey: "agent_id",
    meta: {
      label: "Agent ID",
    },
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Agent ID"
        disableColumnHide={false}
      />
    ),
    cell: ({ row }) => <div className="text-xs">{row.original.agent_id}</div>,
    enableHiding: true,
    enableSorting: true,
    enableColumnFilter: true,
  },
  {
    id: "agent-name",
    accessorKey: "agent-name",
    meta: {
      label: "Agent Name",
    },
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Agent Name"
        disableColumnHide={false}
      />
    ),
    cell: ({ row }) => <div className="text-xs">{row.original.agent.name}</div>,
    enableHiding: true,
    enableSorting: true,
  },
  {
    id: "agent-hostname",
    accessorKey: "agent-hostname",
    meta: {
      label: "Agent Hostname",
    },
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Agent Hostname"
        disableColumnHide={false}
      />
    ),
    cell: ({ row }) => (
      <div className="text-xs">{row.original.agent.hostname}</div>
    ),
    enableHiding: true,
    enableSorting: true,
  },
  {
    id: "agent-ip",
    accessorKey: "agent-ip",
    meta: {
      label: "Agent IP",
    },
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Agent IP"
        disableColumnHide={false}
      />
    ),
    cell: ({ row }) => (
      <div className="text-xs">{row.original.agent.ip_address ?? "N/A"}</div>
    ),
    enableHiding: true,
    enableSorting: true,
  },
  {
    id: "ip",
    accessorKey: "ip",
    meta: {
      label: "Suspicious IP",
    },
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Suspicious IP"
        disableColumnHide={true}
      />
    ),
    enableColumnFilter: false,
    enableSorting: true,
    cell: ({ row }) => {
      const low = row.original.risk_category.toLowerCase() === "low";
      const medium = row.original.risk_category.toLowerCase() === "medium";
      const high = row.original.risk_category.toLowerCase() === "high";
      return (
        <Badge
          variant={
            low
              ? "info-subtle"
              : medium
                ? "yellow-subtle"
                : high
                  ? "red-subtle"
                  : "gray-subtle"
          }
        >
          <div className="text-xs">{row.original.ip}</div>
        </Badge>
      );
    },
    enableHiding: false,
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
    id: "request_per_second",
    accessorKey: "request_per_second",
    meta: {
      label: "Request per Second",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Request per Second" />
    ),
    cell: ({ row }) => (
      <div className="text-xs">{row.original.request_per_second} r/s</div>
    ),
  },
  {
    id: "unique_endpoint_ratio",
    accessorKey: "unique_endpoint_ratio",
    meta: {
      label: "Unique Endpoint Ratio",
    },
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Unique Endpoint Ratio"
        disableColumnHide={true}
      />
    ),
    cell: ({ row }) => (
      <div className="text-xs">{row.original.unique_endpoint_ratio}</div>
    ),
    enableHiding: false,
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
              ? "info-subtle"
              : medium
                ? "yellow-subtle"
                : high
                  ? "red-subtle"
                  : "gray-subtle"
          }
        >
          <div className="text-xs">{row.original.risk_category}</div>
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
      return reason.map((e) => (
        <Badge key={e} variant="teal-subtle" className="ml-1">
          {e}
        </Badge>
      ));
    },
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
              ? "info-subtle"
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
    id: "created_at",
    accessorKey: "created_at",
    meta: {
      label: "Created",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Created" />
    ),
    cell: ({ row }) => <DateCell date={row.original.updated_at} />,
  },
];
