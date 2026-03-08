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
import { useRevokeToken } from "@/query/token.query";

export default function TokenRevokeDialog({
  tokenId,
  tokenValue,
  open,
  onOpenChange,
  onSuccess,
}: {
  tokenId: number;
  tokenValue: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const { mutateAsync, isPending } = useRevokeToken();

  const handleRevoke = async () => {
    await mutateAsync(tokenId);
    onSuccess?.();
    onOpenChange(false);
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangleIcon className="h-5 w-5" />
            Revoke Token
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Are you sure you want to revoke this token? This action cannot be
            undone.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <ResponsiveDialogBody className="py-4">
          <p className="text-sm">
            Token: <code className="rounded bg-muted px-1">{tokenValue}</code>
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Any devices using this token will no longer be able to authenticate.
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
            onClick={handleRevoke}
            disabled={isPending}
          >
            {isPending && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
            Revoke Token
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
