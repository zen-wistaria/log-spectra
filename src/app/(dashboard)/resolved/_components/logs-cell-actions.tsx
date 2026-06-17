import { Eye, MoreHorizontal, Pencil, ShieldAlert } from "lucide-react";
import { useRouter } from "nextjs-toploader/app";
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
import DialogConfirmUnresolved from "./dialog-confirm-unresolved";
import type { IColumns } from "./logs-columns";
import LogsFormEditNotes from "./logs-form-edit-notes";

export default function CellActions({ row }: { row: IColumns }) {
  const [isDropdownMenuOpen, setIsDropdownMenuOpen] = useState(false);
  const [isUnresolvedOpen, setIsUnresolvedOpen] = useState(false);
  const [isEditNotesOpen, setIsEditNotesOpen] = useState(false);
  const { mutateAsync: updateAnomalyResolved } = useUpdateAnomalyResolved();
  const onSubmit = async (values: AnomalyUpdate) => {
    updateAnomalyResolved(values);
  };
  const router = useRouter();

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
          <CopyClipboardDropdownMenuItem
            textToCopy={String(row.ip)}
            label="Copy IP"
          />
          <CopyClipboardDropdownMenuItem
            textToCopy={String(row.agent_id)}
            label="Copy Agent ID"
          />
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => {
              router.push(`/reports/ip/${row.ip}`);
            }}
            variant="default"
          >
            <Eye className="size-4" />
            Details IP
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => {
              setIsUnresolvedOpen(true);
              setIsDropdownMenuOpen(false);
            }}
            variant="destructive"
          >
            <ShieldAlert className="size-4" />
            Mark as Unresolved
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => {
              setIsEditNotesOpen(true);
              setIsDropdownMenuOpen(false);
            }}
          >
            <Pencil className="size-4" />
            Edit Notes
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <DialogConfirmUnresolved
        onSubmit={onSubmit}
        row={{
          ip: row.ip,
          resolved_at: undefined,
          resolved_notes: undefined,
          agent_id: row.agent_id,
          resolved_mark: false,
          agents: [row.agent],
        }}
        open={isUnresolvedOpen}
        onOpenChange={setIsUnresolvedOpen}
      />

      {isEditNotesOpen && (
        <LogsFormEditNotes
          open={isEditNotesOpen}
          onOpenChange={setIsEditNotesOpen}
          onSubmit={onSubmit}
          row={{
            ip: row.ip,
            resolved_at: undefined,
            resolved_notes: row.resolved_notes ?? "",
            agent_id: row.agent_id,
            resolved_mark: row.resolved_mark,
            agents: [row.agent],
          }}
        />
      )}
    </div>
  );
}
