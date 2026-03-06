"use client";

import { XIcon } from "lucide-react";

import { DialogOverlay } from "./ui/dialog";
import {
  ResponsiveDialog,
  ResponsiveDialogClose,
  ResponsiveDialogContent,
  ResponsiveDialogTitle,
} from "./ui/responsive-dialog";

interface EditModalProps {
  title: string;
  description?: string;
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export default function Modal({
  title,
  description,
  isOpen,
  onClose,
  children,
}: EditModalProps) {
  return (
    <ResponsiveDialog open={isOpen} onOpenChange={onClose}>
      <DialogOverlay className="bg-background/40 fixed inset-0 backdrop-blur-xs" />
      <ResponsiveDialogContent
        onInteractOutside={(e) => e.preventDefault()}
        className="max-h-[90vh] w-full overflow-hidden p-0 sm:max-w-2xl"
      >
        <div className="flex h-full flex-col">
          {/* HEADER STICKY */}
          <div className="bg-background sticky top-0 z-20 flex items-center justify-between border-b px-6 py-4">
            <div className="flex flex-col gap-1">
              <ResponsiveDialogTitle>{title}</ResponsiveDialogTitle>
              {description && (
                <p className="text-muted-foreground text-sm">{description}</p>
              )}
            </div>

            {/* CLOSE BUTTON */}
            <ResponsiveDialogClose className="hover:bg-muted rounded-md p-1">
              <XIcon className="h-5 w-5" />
            </ResponsiveDialogClose>
          </div>

          {/* SCROLL AREA */}
          <div className="flex-1 space-y-4 overflow-y-auto p-6">{children}</div>
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
