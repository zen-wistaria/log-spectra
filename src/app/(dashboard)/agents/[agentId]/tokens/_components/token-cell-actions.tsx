import { MoreHorizontal, X } from "lucide-react";

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
import type { IColumns } from "./token-columns";
import TokenRevokeDialog from "./token-dialog-revoke";

export default function CellActions({ row }: { row: IColumns }) {
  const [isDropdownMenuOpen, setIsDropdownMenuOpen] = useState(false);
  const [isRevokeDialogOpen, setIsRevokeDialogOpen] = useState(false);

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
          <CopyClipboardDropdownMenuItem
            textToCopy={String(row.token)}
            label="Copy Token"
          />
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => {
              setIsRevokeDialogOpen(true);
              setIsDropdownMenuOpen(false);
            }}
            variant="destructive"
            disabled={!row.is_active}
          >
            <X className="size-4" />
            Revoke
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <TokenRevokeDialog
        key={`token-${row.id}`}
        tokenId={row.id}
        tokenValue={row.token}
        open={isRevokeDialogOpen}
        onOpenChange={setIsRevokeDialogOpen}
        onSuccess={() => setIsRevokeDialogOpen(false)}
      />
    </>
  );
}
