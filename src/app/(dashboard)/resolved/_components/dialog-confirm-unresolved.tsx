"use client";

import { useForm } from "@tanstack/react-form";
import { useState } from "react";
import { Button } from "@/components/ui/button";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  type AnomalyUpdate,
  AnomalyUpdateSchema,
} from "@/schema/anomaly.schema";

interface LogsFormUnresolvedProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: AnomalyUpdate;
  onSubmit: (values: AnomalyUpdate) => Promise<void>;
}

export default function DialogConfirmUnresolved({
  open,
  onOpenChange,
  row,
  onSubmit,
}: LogsFormUnresolvedProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm({
    defaultValues: {
      resolved_mark: row.resolved_mark,
      resolved_notes: row.resolved_notes,
      ip: row.ip,
      agent_id: row.agent_id,
      agents: [{ id: row.agent_id }],
    } as AnomalyUpdate,
    validators: {
      onSubmit: AnomalyUpdateSchema,
    },
    onSubmit: async ({ value }) => {
      if (!row) return;

      setIsSubmitting(true);
      try {
        const payload = {
          ...value,
          ip: row.ip,
          resolved_at: new Date(),
        };

        await onSubmit(payload);
        onOpenChange(false);
        form.reset();
      } catch (error) {
        console.error("Failed to resolve:", error);
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  if (!row) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Mark as Unresolved</DialogTitle>
          <DialogDescription>
            Mark anomaly for IP{" "}
            <span className="font-mono font-bold">{row.ip}</span> as unresolved.{" "}
            <br />
            Reported by agent{" "}
            <span className="font-mono font-bold">{row.agents?.[0]?.name}</span>
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
          className="space-y-4 py-4"
        >
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Unresolving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
