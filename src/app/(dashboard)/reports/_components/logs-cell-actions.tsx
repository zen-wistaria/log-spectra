import { MoreHorizontal, ShieldCheck, Trash } from "lucide-react";
import { useState } from "react";
import { CopyClipboardDropdownMenuItem } from "@/components/copy-clipboard-dropdown-menu-item";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUpdateAnomalyResolved } from "@/query/anomaly.query";
import type { AnomalyUpdate } from "@/schema/anomaly.schema";
import type { IColumns } from "./logs-columns";
import LogsFormResolved from "./logs-form-resolved";

export default function CellActions({ row }: { row: IColumns }) {
  const [isDropdownMenuOpen, setIsDropdownMenuOpen] = useState(false);
  const [isResolvedOpen, setIsResolvedOpen] = useState(false);
  const { mutateAsync: updateAnomalyResolved } = useUpdateAnomalyResolved();
  const onSubmit = async (values: AnomalyUpdate) => {
    updateAnomalyResolved(values);
  };

  return (
    <div>
      <DropdownMenu
        open={isDropdownMenuOpen}
        onOpenChange={setIsDropdownMenuOpen}
      >
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="data-[state=open]:bg-muted h-8 p-2"
          >
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <CopyClipboardDropdownMenuItem textToCopy={String(row.id)} />
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => {
              setIsResolvedOpen(true);
              setIsDropdownMenuOpen(false);
            }}
            variant="success"
            // className="text-green-600"
          >
            <ShieldCheck className="size-4" />
            Mark as Resolved
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <LogsFormResolved
        onSubmit={onSubmit}
        row={{
          ...row,
          resolved_at: new Date(),
          resolved_notes: "",
          resolved_mark: true,
        }}
        open={isResolvedOpen}
        onOpenChange={setIsResolvedOpen}
      />
    </div>
  );
}
