"use client";

import type { ApiToken } from "@prisma/client";
import type { ColumnDef } from "@tanstack/react-table";
import { CheckCircle, XCircle } from "lucide-react";
import { DataTableColumnHeader } from "@/components/data-tables/data-table-column-header";
import { DateCell } from "@/components/data-tables/date-cell";
import { Badge } from "@/components/ui/badge";
import CellActions from "./token-cell-actions";

export type IColumns = ApiToken;

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
    id: "token",
    accessorKey: "token",
    meta: {
      label: "Token",
    },
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Token"
        disableColumnHide={true}
      />
    ),
    cell: ({ row }) => (
      <div className="text-xs">
        {row.original.token.substring(0, 10)} * * * * * * * * * * * * * * * * *
        * * * *
      </div>
    ),
    enableHiding: false,
  },
  {
    id: "is_active",
    accessorKey: "is_active",
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
      <Badge variant={row.original.is_active ? "green-subtle" : "red-subtle"}>
        {row.original.is_active ? (
          <>
            <CheckCircle size={16} className="mr-1" />
            Active
          </>
        ) : (
          <>
            <XCircle size={16} className="mr-1" />
            Revoked
          </>
        )}
      </Badge>
    ),
    enableHiding: false,
  },
  {
    id: "last_used",
    accessorKey: "last_used",
    meta: {
      label: "Last Used",
    },
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Last Used"
        disableColumnHide={true}
      />
    ),
    cell: ({ row }) => <DateCell date={row.original.last_used} />,
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
