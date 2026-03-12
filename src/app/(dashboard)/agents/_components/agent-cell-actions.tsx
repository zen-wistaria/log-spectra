import {
  Earth,
  Eye,
  FolderSymlink,
  KeyRound,
  Loader2,
  MoreHorizontal,
  Pencil,
  Power,
  Trash,
} from "lucide-react";
import { useRouter } from "nextjs-toploader/app";
import { useState } from "react";
import { CopyClipboardDropdownMenuItem } from "@/components/copy-clipboard-dropdown-menu-item";
import Modal from "@/components/modal";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { IColumns } from "./agent-columns";
import AgentDeleteDialog from "./agent-dialog-delete";
import AgentUpdateForm from "./agent-form-update";

export default function CellActions({ row }: { row: IColumns }) {
  const [isDropdownMenuOpen, setIsDropdownMenuOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const router = useRouter();

  return (
    <>
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
              setIsEditModalOpen(true);
              setIsDropdownMenuOpen(false);
            }}
          >
            <Pencil className="size-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => {
              router.push(`/agents/${row.id}`);
            }}
          >
            <Eye className="size-4" />
            Details
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => {
              router.push(`/agents/${row.id}/tokens`);
            }}
          >
            <KeyRound className="size-4" />
            Tokens
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => {
              setIsDeleteDialogOpen(true);
              setIsDropdownMenuOpen(false);
            }}
            variant="destructive"
          >
            <Trash className="size-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AgentDeleteDialog
        key={`agent-${row.id}`}
        agentId={row.id}
        agentName={row.name}
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onSuccess={() => setIsDeleteDialogOpen(false)}
      />
      <Modal
        title="Edit Agent"
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
      >
        <AgentUpdateForm
          key={`agent-${row.id}`}
          agent={{
            ...row,
            description: row.description || "",
            machine_id: row.machine_id || "",
          }}
          onSuccess={() => setIsEditModalOpen(false)}
        />
      </Modal>
    </>
  );
}
