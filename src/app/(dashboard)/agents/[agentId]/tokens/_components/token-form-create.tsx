"use client";

import { useForm } from "@tanstack/react-form";
import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { useCreateToken } from "@/query/token.query";
import { type TokenCreate, TokenCreateSchema } from "@/schema/token.schema";

export default function TokenCreateForm({
  agentId,
  onSuccess,
}: {
  agentId: string;
  onSuccess: () => void;
}) {
  const { mutateAsync, isPending } = useCreateToken();
  const form = useForm({
    defaultValues: {
      is_active: true,
      agent_id: agentId,
    } as TokenCreate,
    validators: {
      onSubmit: TokenCreateSchema,
    },
    onSubmit: async ({ value }) => {
      await mutateAsync({ ...value });
      onSuccess?.();
    },
  });

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Create Token</CardTitle>
        <CardDescription>
          A new unique token will be generated automatically.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          id="token-create-form"
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
        >
          <FieldGroup>
            <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
              Tokens are secure, randomly generated strings used to authenticate
              your agent.
            </div>
            <form.Field name="is_active">
              {(field) => (
                <Field orientation="horizontal">
                  <FieldLabel htmlFor={field.name} className="flex-1">
                    Active
                  </FieldLabel>
                  <select
                    id={field.name}
                    value={field.state.value ? "true" : "false"}
                    onChange={(e) =>
                      field.handleChange(e.target.value === "true")
                    }
                    className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </Field>
              )}
            </form.Field>
          </FieldGroup>
        </form>
      </CardContent>
      <CardFooter className="justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => form.reset()}>
          Reset
        </Button>
        <Button type="submit" form="token-create-form" disabled={isPending}>
          {isPending && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
          Create Token
        </Button>
      </CardFooter>
    </Card>
  );
}
