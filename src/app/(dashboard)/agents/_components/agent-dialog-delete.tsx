"use client";

import { AlertTriangleIcon, Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import { useDeleteAgent } from "@/query/agent.query";

export default function AgentDeleteDialog({
  agentId,
  agentName,
  open,
  onOpenChange,
  onSuccess,
}: {
  agentId: string;
  agentName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const { mutateAsync, isPending } = useDeleteAgent();

  const handleDelete = async () => {
    await mutateAsync(agentId);
    onSuccess?.();
    onOpenChange(false);
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangleIcon className="h-5 w-5" />
            Delete Agent
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Are you sure you want to delete <strong>{agentName}</strong>? This
            action cannot be undone and will remove all associated tokens and
            logs.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <ResponsiveDialogBody className="py-4">
          <p className="text-sm text-muted-foreground">
            Deleting an agent will stop all monitoring and data collection for
            this host.
          </p>
        </ResponsiveDialogBody>
        <ResponsiveDialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isPending}
          >
            {isPending && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
            Delete Agent
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
