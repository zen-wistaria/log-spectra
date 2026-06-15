"use client";

import type { Users } from "@prisma/client";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/data-tables/data-table-column-header";
import { DateCell } from "@/components/data-tables/date-cell";
import { Badge } from "@/components/ui/badge";
import CellActions from "./user-cell-actions";

export type IColumns = Omit<Users, "password">;

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
      <div className="text-sm font-medium">{row.original.name}</div>
    ),
    enableHiding: false,
  },
  {
    id: "username",
    accessorKey: "username",
    meta: {
      label: "Username",
    },
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Username"
        disableColumnHide={true}
      />
    ),
    cell: ({ row }) => (
      <div className="text-xs text-muted-foreground font-mono">
        {row.original.username}
      </div>
    ),
    enableHiding: false,
  },
  {
    id: "email",
    accessorKey: "email",
    meta: {
      label: "Email",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Email" />
    ),
    cell: ({ row }) => (
      <div className="text-xs">{row.original.email || "N/A"}</div>
    ),
  },
  {
    id: "role",
    accessorKey: "role",
    meta: {
      label: "Role",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Role" />
    ),
    cell: ({ row }) => (
      <Badge variant={row.original.role === "admin" ? "default" : "secondary"}>
        {row.original.role.toUpperCase()}
      </Badge>
    ),
  },
  {
    id: "createdAt",
    accessorKey: "createdAt",
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
    cell: ({ row }) => <DateCell date={row.original.createdAt} />,
    enableHiding: false,
  },
  {
    id: "actions",
    cell: ({ row }) => <CellActions row={row.original} />,
  },
];
