"use client";

import { ShieldAlert, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import DialogConfirmUnresolved from "@/app/(dashboard)/resolved/_components/dialog-confirm-unresolved";
import { Button } from "@/components/ui/button";
import { useUpdateAnomalyResolved } from "@/query/anomaly.query";
import type { AnomalyUpdate } from "@/schema/anomaly.schema";
import LogsFormResolved from "../../_components/logs-form-resolved";

interface ThreadResolveButtonProps {
  ip: string;
  agentId: string;
  agentName: string;
  resolvedMark: boolean;
  resolvedNotes?: string | null;
}

export function ThreadResolveButton({
  ip,
  agentId,
  agentName,
  resolvedMark,
  resolvedNotes,
}: ThreadResolveButtonProps) {
  const [isResolvedOpen, setIsResolvedOpen] = useState(false);
  const [isUnresolvedOpen, setIsUnresolvedOpen] = useState(false);
  const { mutateAsync: updateAnomalyResolved } = useUpdateAnomalyResolved();
  const router = useRouter();

  const onSubmit = async (values: AnomalyUpdate) => {
    await updateAnomalyResolved(values);
    router.refresh();
  };

  if (resolvedMark) {
    return (
      <>
        <Button
          variant="outline"
          size="sm"
          className="text-red-600 border-red-600/30 hover:bg-red-600/10 hover:text-red-600"
          onClick={() => setIsUnresolvedOpen(true)}
        >
          <ShieldAlert className="size-3.5 mr-1.5" />
          Mark as Unresolved
        </Button>
        <DialogConfirmUnresolved
          onSubmit={onSubmit}
          row={{
            ip,
            resolved_at: undefined,
            resolved_notes: undefined,
            agent_id: agentId,
            resolved_mark: false,
            agents: [{ id: agentId, name: agentName }],
          }}
          open={isUnresolvedOpen}
          onOpenChange={setIsUnresolvedOpen}
        />
      </>
    );
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="text-green-600 border-green-600/30 hover:bg-green-600/10 hover:text-green-600"
        onClick={() => setIsResolvedOpen(true)}
      >
        <ShieldCheck className="size-3.5 mr-1.5" />
        Mark as Resolved
      </Button>
      {isResolvedOpen && (
        <LogsFormResolved
          onSubmit={onSubmit}
          row={
            {
              ip,
              agent_id: agentId,
              resolved_at: new Date(),
              resolved_notes: resolvedNotes ?? "",
              resolved_mark: true,
            } as AnomalyUpdate
          }
          open={isResolvedOpen}
          onOpenChange={setIsResolvedOpen}
        />
      )}
    </>
  );
}
