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
import { FieldGroup } from "@/components/ui/field";
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
          </FieldGroup>
        </form>
      </CardContent>
      <CardFooter className="justify-end gap-2">
        <Button type="submit" form="token-create-form" disabled={isPending}>
          {isPending && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
          Create Token
        </Button>
      </CardFooter>
    </Card>
  );
}
