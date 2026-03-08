"use client";

import copy from "clipboard-copy";
import { Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { DropdownMenuItem } from "./ui/dropdown-menu";

interface IProps extends React.ComponentProps<"div"> {
  textToCopy: string;
  label?: string;
  successMessage?: string;
}

export function CopyClipboardDropdownMenuItem({
  textToCopy,
  label = "Copy ID",
  successMessage = "Copied to clipboard!",
}: IProps) {
  const [isCopied, setIsCopied] = useState(false);

  const onCopy = async () => {
    if (isCopied) return;

    try {
      await copy(textToCopy);
      setIsCopied(true);
      toast.info(successMessage);

      // Reset copied status after 2 seconds
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      toast.error("Failed to copy. Please try again.");
    }
  };

  return (
    <DropdownMenuItem onClick={() => onCopy()} disabled={isCopied}>
      <Copy className="size-4" />
      {isCopied ? "Copied!" : label}
    </DropdownMenuItem>
  );
}
