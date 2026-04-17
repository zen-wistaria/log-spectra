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
import { FieldError } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
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

  const { data, isPending } = useGetAgentFromAnomalyIps(row.ip);

  const form = useForm({
    defaultValues: {
      resolved_mark: row.resolved_mark,
      resolved_notes: row.resolved_notes,
      ip: row.ip,
      agent_id: row.agent_id,
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
            <span className="font-mono font-bold">{row.ip}</span>. Select the
            reporting agent and add notes.
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
            <form.Field name="agent_id">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched &&
                  field.state.meta.errors.length > 0;
                return (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Reporting Agent</Label>
                    <Select
                      onValueChange={field.handleChange}
                      defaultValue={row.agent_id}
                      value={field.state.value}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select an agent" />
                      </SelectTrigger>
                      <SelectContent>
                        {data?.map((data) => (
                          <SelectItem key={data.agent.id} value={data.agent.id}>
                            {data.agent.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </div>
                );
              }}
            </form.Field>
          )}

          <form.Field name="resolved_mark">
            {(field) => (
              <div className="flex items-center space-x-2">
                <Label
                  htmlFor="resolved_mark"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Mark as Resolved
                </Label>
                <Switch
                  id={field.name}
                  checked={field.state.value}
                  onCheckedChange={field.handleChange}
                />
              </div>
            )}
          </form.Field>

          <form.Field name="resolved_notes">
            {(field) => {
              const isInvalid =
                field.state.meta.isTouched &&
                field.state.meta.errors.length > 0;
              return (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Resolution Notes</Label>
                  <Textarea
                    id={field.name}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="Explain why this is resolved..."
                    className="resize-none"
                  />
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
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
