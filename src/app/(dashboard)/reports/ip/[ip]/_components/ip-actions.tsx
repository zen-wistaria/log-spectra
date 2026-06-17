"use client";

import { Check, Copy, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useUpdateAnomalyResolved } from "@/query/anomaly.query";
import type { AnomalyUpdate } from "@/schema/anomaly.schema";
import LogsFormResolved from "../../../_components/logs-form-resolved";

export function IpActionButtons({ ip }: { ip: string }) {
  const [isResolvedOpen, setIsResolvedOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { mutateAsync: updateAnomalyResolved } = useUpdateAnomalyResolved();

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
      <Button
        variant="default"
        size="sm"
        className="bg-green-600 hover:bg-green-700"
        onClick={() => setIsResolvedOpen(true)}
      >
        <ShieldCheck className="size-4 mr-2" />
        Mark as Resolved
      </Button>

      {isResolvedOpen && (
        <LogsFormResolved
          onSubmit={async (values) => {
            await updateAnomalyResolved(values);
          }}
          row={
            {
              ip,
              agent_id: "",
              resolved_at: new Date(),
              resolved_notes: "",
              resolved_mark: true,
            } as AnomalyUpdate
          }
          open={isResolvedOpen}
          onOpenChange={setIsResolvedOpen}
        />
      )}
    </div>
  );
}
