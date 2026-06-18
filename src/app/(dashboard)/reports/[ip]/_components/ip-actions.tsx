"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AbuseIpDbReportDialog } from "./abuseipdb-report-dialog";

export function IpActionButtons({ ip }: { ip: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(ip);
      setCopied(true);
      toast.success("IP copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy IP");
    }
  };

  return (
    <div className="flex items-center gap-2 mt-4 sm:mt-0">
      <Button variant="outline" size="sm" onClick={handleCopy}>
        {copied ? (
          <Check className="size-4 mr-2 text-green-500" />
        ) : (
          <Copy className="size-4 mr-2" />
        )}
        Copy IP
      </Button>
      <AbuseIpDbReportDialog ip={ip} />
    </div>
  );
}
