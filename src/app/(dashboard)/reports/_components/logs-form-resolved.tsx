"use client";

import { useForm } from "@tanstack/react-form";
import { Loader2Icon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { useGetAgentFromAnomalyIps } from "@/query/anomaly.query";
import {
  type AnomalyUpdate,
  AnomalyUpdateSchema,
} from "@/schema/anomaly.schema";

interface LogsFormResolvedProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: AnomalyUpdate;
  onSubmit: (values: AnomalyUpdate) => Promise<void>;
}

export default function LogsFormResolved({
  open,
  onOpenChange,
  row,
  onSubmit,
}: LogsFormResolvedProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data, isPending } = useGetAgentFromAnomalyIps({
    ip: row.ip,
    fetch: open,
  });

  const form = useForm({
    defaultValues: {
      resolved_mark: true,
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
          <DialogTitle>Mark as Resolved</DialogTitle>
          <DialogDescription>
            Resolve anomaly for IP{" "}
            <span className="font-mono font-bold">{row.ip}</span>. <br />
            Select the reporting agents and add notes.
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
          {isPending ? (
            <div>
              <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
              Loading agents...
            </div>
          ) : (
            <form.Field name="agents" mode="array">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched &&
                  field.state.meta.errors.length > 0;

                const selectedAgents = (field.state.value ?? []) as {
                  id: string;
                }[];
                const selectedIds = selectedAgents.map((a) => a.id);

                return (
                  <div className="space-y-2">
                    <FieldLabel>Reporting Agents</FieldLabel>
                    <div className="space-y-2 rounded-md border p-3">
                      {data?.map((item) => {
                        const checked = selectedIds.includes(item.agent.id);
                        const isCurrentAgent = item.agent.id === row.agent_id;

                        return (
                          <div
                            key={item.agent.id}
                            className="flex items-center space-x-2"
                          >
                            <Checkbox
                              id={`agent-${item.agent.id}`}
                              checked={checked}
                              onCheckedChange={(checkedState) => {
                                if (checkedState) {
                                  field.handleChange([
                                    ...selectedAgents,
                                    { id: item.agent.id },
                                  ]);
                                } else {
                                  if (isCurrentAgent) return;
                                  field.handleChange(
                                    selectedAgents.filter(
                                      (a) => a.id !== item.agent.id,
                                    ),
                                  );
                                }
                              }}
                            />
                            <FieldLabel
                              htmlFor={`agent-${item.agent.id}`}
                              className="cursor-pointer font-normal"
                            >
                              {item.agent.name}
                              {isCurrentAgent && (
                                <span className="ml-2 text-xs text-muted-foreground">
                                  (current)
                                </span>
                              )}
                            </FieldLabel>
                          </div>
                        );
                      })}
                    </div>
                    <FieldDescription>
                      These agents also reporting ip <strong>{row.ip}</strong>.
                    </FieldDescription>
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </div>
                );
              }}
            </form.Field>
          )}

          <form.Field name="resolved_notes">
            {(field) => {
              const isInvalid =
                field.state.meta.isTouched &&
                field.state.meta.errors.length > 0;
              return (
                <div className="space-y-2">
                  <FieldLabel htmlFor={field.name}>Resolution Notes</FieldLabel>
                  <Textarea
                    id={field.name}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="Explain why this is resolved..."
                    className="resize-none"
                  />
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                  <FieldDescription>
                    Add notes to explain why this is resolved.
                  </FieldDescription>
                </div>
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
              {isSubmitting ? "Resolving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
