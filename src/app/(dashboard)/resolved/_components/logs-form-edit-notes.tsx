"use client";

import { useForm } from "@tanstack/react-form";
import { Loader2 } from "lucide-react";
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
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { useAgentById } from "@/query/agent.query";
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

export default function LogsFormEditNotes({
  open,
  onOpenChange,
  row,
  onSubmit,
}: LogsFormUnresolvedProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // const { data: agent } = useAgentById(row.agent_id);

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
          <DialogTitle>Edit Notes</DialogTitle>
          <DialogDescription>
            Edit notes for anomaly for IP{" "}
            <span className="font-mono font-bold">{row.ip}</span>.
            <br />
            Reported by Agent{" "}
            <span className="font-mono font-bold">
              {row?.agents?.[0]?.name}
            </span>
            .
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
          <form.Field name="resolved_notes">
            {(field) => {
              const isInvalid =
                field.state.meta.isTouched &&
                field.state.meta.errors.length > 0;
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Resolution Notes</FieldLabel>
                  <Textarea
                    id={field.name}
                    name={field.name}
                    value={field.state.value ?? ""}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="Optional description"
                    rows={3}
                    className="min-h-20 resize-none"
                    aria-invalid={isInvalid}
                  />
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              );
            }}
          </form.Field>
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
