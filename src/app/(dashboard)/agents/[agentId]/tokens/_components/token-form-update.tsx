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
import { Input } from "@/components/ui/input";
import { useUpdateToken } from "@/query/token.query";
import { TokenUpdateSchema } from "@/schema/token.schema";

export default function TokenUpdateForm({
  tokenData,
  onSuccess,
}: {
  tokenData: any;
  onSuccess: () => void;
}) {
  const { mutateAsync, isPending } = useUpdateToken();
  const form = useForm({
    defaultValues: tokenData,
    validators: {
      onSubmit: TokenUpdateSchema,
    },
    onSubmit: async ({ value }) => {
      await mutateAsync(value);
      onSuccess?.();
    },
  });

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Update Token</CardTitle>
        <CardDescription>
          Modify token properties or toggle status.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          id="token-update-form"
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
        >
          <FieldGroup>
            <form.Field name="token">
              {(field) => {
                return (
                  <Field>
                    <FieldLabel htmlFor={field.name}>Token Value</FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      readOnly
                      className="bg-muted font-mono text-xs"
                      placeholder="Token value"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      Tokens are auto-generated and cannot be edited manually.
                    </p>
                  </Field>
                );
              }}
            </form.Field>
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
        <Button type="submit" form="token-update-form" disabled={isPending}>
          {isPending && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
          Update Token
        </Button>
      </CardFooter>
    </Card>
  );
}
