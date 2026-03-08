"use client";

import { useForm } from "@tanstack/react-form";
import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupTextarea } from "@/components/ui/input-group";
import { useCreateAgent } from "@/query/agent.query";
import { type AgentCreate, AgentCreateSchema } from "@/schema/agent.schema";

export default function AgentCreateForm({
  onSuccess,
}: {
  onSuccess: () => void;
}) {
  const { mutateAsync, isPending } = useCreateAgent();
  const form = useForm({
    defaultValues: {
      name: "",
      description: "",
    } as AgentCreate,
    validators: {
      onSubmit: AgentCreateSchema,
    },
    onSubmit: async ({ value }) => {
      await mutateAsync(value);
      onSuccess?.();
    },
  });

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Create New Agent</CardTitle>
        <CardDescription>
          Fill in the form below to create a new agent.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          id="agent-create-form"
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
          className="space-y-4"
        >
          <FieldGroup>
            <form.Field name="name">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched &&
                  field.state.meta.errors.length > 0;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Name</FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                      placeholder="Agent Name"
                      autoComplete="off"
                    />
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                    <FieldDescription className="text-xs text-muted-foreground">
                      Input the name of the agent.
                    </FieldDescription>
                  </Field>
                );
              }}
            </form.Field>
            <form.Field name="description">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched &&
                  field.state.meta.errors.length > 0;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Description</FieldLabel>
                    <InputGroup>
                      <InputGroupTextarea
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
                    </InputGroup>
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                    <FieldDescription className="text-xs text-muted-foreground">
                      Input the description of the agent. This is optional.
                    </FieldDescription>
                  </Field>
                );
              }}
            </form.Field>
          </FieldGroup>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => form.reset()}
            >
              Reset
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && (
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create Agent
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
