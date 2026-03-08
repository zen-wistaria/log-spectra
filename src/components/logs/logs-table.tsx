"use client";

import {
  type ColumnDef,
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowUpDown, ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  dummyLogs,
  formatBytes,
  formatDate,
  getAnomalyBgColor,
  type LogEntry,
} from "@/lib/dummy-data";

const columns: ColumnDef<LogEntry>[] = [
  {
    id: "no",
    header: "No",
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.index + 1}</span>
    ),
    enableSorting: false,
  },
  {
    accessorKey: "timestamp",
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Timestamp
        <ArrowUpDown className="ml-1 h-3 w-3" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="text-sm">{formatDate(row.original.timestamp)}</span>
    ),
  },
  {
    accessorKey: "agent_id",
    header: "Agent ID",
    cell: ({ row }) => (
      <span className="font-mono text-sm">{row.original.agent_id}</span>
    ),
  },
  {
    accessorKey: "hostname",
    header: "Hostname",
  },
  {
    accessorKey: "client_ip",
    header: "Client IP",
    cell: ({ row }) => (
      <span className="font-mono text-sm">{row.original.client_ip}</span>
    ),
  },
  {
    accessorKey: "method",
    header: "Method",
    cell: ({ row }) => {
      const method = row.original.method;
      const colors: Record<string, string> = {
        GET: "bg-blue-500/10 text-blue-600",
        POST: "bg-green-500/10 text-green-600",
        PUT: "bg-yellow-500/10 text-yellow-600",
        DELETE: "bg-red-500/10 text-red-600",
      };
      return (
        <Badge variant="secondary" className={colors[method] ?? ""}>
          {method}
        </Badge>
      );
    },
  },
  {
    accessorKey: "endpoint",
    header: "Endpoint",
    cell: ({ row }) => (
      <span className="font-mono text-xs">{row.original.endpoint}</span>
    ),
  },
  {
    accessorKey: "status_code",
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Status
        <ArrowUpDown className="ml-1 h-3 w-3" />
      </Button>
    ),
    cell: ({ row }) => {
      const code = row.original.status_code;
      const color =
        code >= 500
          ? "bg-red-500/10 text-red-600"
          : code >= 400
            ? "bg-yellow-500/10 text-yellow-600"
            : "bg-green-500/10 text-green-600";
      return (
        <Badge variant="secondary" className={color}>
          {code}
        </Badge>
      );
    },
  },
  {
    accessorKey: "bytes",
    header: "Bytes",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {formatBytes(row.original.bytes)}
      </span>
    ),
  },
  {
    accessorKey: "anomaly_score",
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Score
        <ArrowUpDown className="ml-1 h-3 w-3" />
      </Button>
    ),
    cell: ({ row }) => (
      <Badge
        variant="secondary"
        className={getAnomalyBgColor(row.original.anomaly_score)}
      >
        {(row.original.anomaly_score * 100).toFixed(0)}%
      </Badge>
    ),
  },
  {
    accessorKey: "is_suspicious",
    header: "Status",
    cell: ({ row }) =>
      row.original.is_suspicious ? (
        <Badge variant="destructive">Suspicious</Badge>
      ) : (
        <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20">
          Normal
        </Badge>
      ),
    filterFn: (row, _id, filterValue: string) => {
      if (filterValue === "all") return true;
      if (filterValue === "suspicious") return row.original.is_suspicious;
      if (filterValue === "normal") return !row.original.is_suspicious;
      return true;
    },
  },
];

export function LogsTable() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const data = useMemo(() => dummyLogs, []);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    initialState: {
      pagination: { pageSize: 10 },
    },
  });

  function handleStatusFilter(value: string) {
    setStatusFilter(value);
    table.getColumn("is_suspicious")?.setFilterValue(value);
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Filter by IP address..."
          value={
            (table.getColumn("client_ip")?.getFilterValue() as string) ?? ""
          }
          onChange={(e) =>
            table.getColumn("client_ip")?.setFilterValue(e.target.value)
          }
          className="h-9 w-[200px]"
        />
        <Input
          placeholder="Filter by status code..."
          value={
            (table.getColumn("status_code")?.getFilterValue() as string) ?? ""
          }
          onChange={(e) =>
            table.getColumn("status_code")?.setFilterValue(e.target.value)
          }
          className="h-9 w-[160px]"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-1">
              <Filter className="h-3.5 w-3.5" />
              {statusFilter === "all"
                ? "All Status"
                : statusFilter === "suspicious"
                  ? "Suspicious"
                  : "Normal"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuCheckboxItem
              checked={statusFilter === "all"}
              onCheckedChange={() => handleStatusFilter("all")}
            >
              All
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={statusFilter === "suspicious"}
              onCheckedChange={() => handleStatusFilter("suspicious")}
            >
              Suspicious
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={statusFilter === "normal"}
              onCheckedChange={() => handleStatusFilter("normal")}
            >
              Normal
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {table.getRowModel().rows.length} of{" "}
          {table.getFilteredRowModel().rows.length} results
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4" />
            Prev
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount()}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
