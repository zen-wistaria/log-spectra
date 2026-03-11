"use client";

import type { Agent } from "@prisma/client";
import type { ColumnDef } from "@tanstack/react-table";
import { CheckCircle, XCircle } from "lucide-react";
import { DataTableColumnHeader } from "@/components/data-tables/data-table-column-header";
import { DateCell } from "@/components/data-tables/date-cell";
import { Badge } from "@/components/ui/badge";
import CellActions from "./agent-cell-actions";

export type IColumns = Agent & {
  _count: {
    anomaly_logs: number;
  };
};

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
  },
  {
    id: "name",
    accessorKey: "name",
    meta: {
      label: "Name",
    },
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Name"
        disableColumnHide={true}
      />
    ),
    cell: ({ row }) => (
      <div className="text-xs text-muted-foreground font-mono">
        {row.original.name}
      </div>
    ),
    enableHiding: false,
  },
  {
    id: "description",
    accessorKey: "description",
    meta: {
      label: "Description",
    },
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Description"
        disableColumnHide={true}
      />
    ),
    cell: ({ row }) => (
      <div className="text-xs">{row.original.description}</div>
    ),
    enableHiding: false,
    enableSorting: true,
  },
  {
    id: "hostname",
    accessorKey: "hostname",
    meta: {
      label: "Hostname",
    },
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Hostname"
        disableColumnHide={true}
      />
    ),
    cell: ({ row }) => (
      <div className="text-xs font-mono text-muted-foreground">
        {row.original.hostname ?? "N/A"}
      </div>
    ),
    enableHiding: false,
  },
  {
    id: "ip_address",
    accessorKey: "ip_address",
    meta: {
      label: "IP",
    },
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="IP"
        disableColumnHide={true}
      />
    ),
    enableColumnFilter: false,
    enableSorting: true,
    cell: ({ row }) => (
      <div className="text-xs font-mono text-muted-foreground">
        {row.original.ip_address ?? "N/A"}
      </div>
    ),
    enableHiding: false,
  },
  {
    id: "os",
    accessorKey: "os",
    meta: {
      label: "OS",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="OS" />
    ),
    cell: ({ row }) => (
      <div className="text-xs font-mono text-muted-foreground">
        {row.original.os ?? "N/A"}
      </div>
    ),
  },
  {
    id: "logs",
    accessorKey: "logs",
    meta: {
      label: "Collected Logs",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Collected Logs" />
    ),
    cell: ({ row }) => (
      <div className="text-xs">{row.original._count.anomaly_logs}</div>
    ),
  },
  {
    id: "last_seen",
    accessorKey: "last_seen",
    meta: {
      label: "Last Seen",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Last Seen" />
    ),
    cell: ({ row }) => <DateCell date={row.original.last_seen} />,
  },
  {
    id: "status",
    accessorKey: "status",
    meta: {
      label: "Status",
    },
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Status"
        disableColumnHide={true}
      />
    ),
    cell: ({ row }) => (
      <Badge variant={row.original.status ? "green-subtle" : "red-subtle"}>
        {row.original.status ? (
          <>
            <CheckCircle size={16} className="mr-1" />
            Active
          </>
        ) : (
          <>
            <XCircle size={16} className="mr-1" />
            Inactive
          </>
        )}
      </Badge>
    ),
    enableHiding: false,
  },
  {
    id: "created_at",
    accessorKey: "created_at",
    meta: {
      label: "Created",
    },
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Created"
        disableColumnHide={true}
      />
    ),
    cell: ({ row }) => <DateCell date={row.original.created_at} />,
    enableHiding: false,
  },
  {
    id: "updated_at",
    accessorKey: "updated_at",
    meta: {
      label: "Updated",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Updated" />
    ),
    cell: ({ row }) => <DateCell date={row.original.updated_at} />,
  },
  {
    id: "actions",
    cell: ({ row }) => <CellActions row={row.original} />,
  },
];
