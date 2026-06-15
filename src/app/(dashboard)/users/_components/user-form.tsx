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
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateUser, useUpdateUser } from "@/query/user.query";
import {
  type UserCreate,
  UserCreateSchema,
  type UserUpdate,
  UserUpdateSchema,
} from "@/schema/user.schema";

export default function UserForm({
  user,
  onSuccess,
}: {
  user?: UserUpdate;
  onSuccess: () => void;
}) {
  const isUpdate = !!user;

  const { mutateAsync: createUser, isPending: isCreating } = useCreateUser();
  const { mutateAsync: updateUser, isPending: isUpdating } = useUpdateUser();

  const isPending = isCreating || isUpdating;

  const form = useForm({
    defaultValues: user
      ? ({ ...user, password: "" } as UserUpdate)
      : ({
          name: "",
          email: "",
          username: "",
          password: "",
          role: "viewer",
        } as UserCreate),
    validators: {
      onSubmit: isUpdate ? UserUpdateSchema : UserCreateSchema,
    },
    onSubmit: async ({ value }) => {
      if (isUpdate) {
        await updateUser(value as UserUpdate);
      } else {
        await createUser(value as UserCreate);
      }
      onSuccess();
    },
  });

  return (
    <Card className="w-full border-none shadow-none sm:border sm:shadow-sm p-0">
      <CardHeader className="px-0 pt-0 sm:px-6 sm:pt-6">
        <CardTitle>{isUpdate ? "Update User" : "Create New User"}</CardTitle>
        <CardDescription>
          {isUpdate
            ? "Modify user details or change their role."
            : "Add a new user and assign a role to them."}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0 pb-0 sm:px-6">
        <form
          id="user-form"
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        placeholder="John Doe"
                        autoComplete="off"
                      />
                      <p className="text-[0.8rem] text-muted-foreground text-xs mt-1">
                        Enter the user's full name.
                      </p>
                      {isInvalid && (
                        <FieldError errors={field.state.meta.errors} />
                      )}
                    </Field>
                  );
                }}
              </form.Field>

              <form.Field name="username">
                {(field) => {
                  const isInvalid =
                    field.state.meta.isTouched &&
                    field.state.meta.errors.length > 0;
                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>Username</FieldLabel>
                      <Input
                        id={field.name}
                        name={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        aria-invalid={isInvalid}
                        placeholder="johndoe"
                        autoComplete="username"
                      />
                      <p className="text-[0.8rem] text-muted-foreground text-xs mt-1">
                        Unique username for logging in.
                      </p>
                      {isInvalid && (
                        <FieldError errors={field.state.meta.errors} />
                      )}
                    </Field>
                  );
                }}
              </form.Field>
            </div>

            <form.Field name="email">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched &&
                  field.state.meta.errors.length > 0;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      type="email"
                      value={field.state.value ?? ""}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                      placeholder="john@example.com"
                    />
                    <p className="text-[0.8rem] text-muted-foreground text-xs mt-1">
                      Valid email address for communications.
                    </p>
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                );
              }}
            </form.Field>

            <form.Field name="role">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched &&
                  field.state.meta.errors.length > 0;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Role</FieldLabel>
                    <Select
                      onValueChange={(val) =>
                        field.handleChange(val as "admin" | "viewer")
                      }
                      defaultValue={field.state.value}
                    >
                      <SelectTrigger id={field.name} aria-invalid={isInvalid}>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[0.8rem] text-muted-foreground text-xs mt-1">
                      Admin has full access, Viewer has read-only access to
                      statistics.
                    </p>
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                );
              }}
            </form.Field>

            <form.Field name="password">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched &&
                  field.state.meta.errors.length > 0;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>
                      Password {isUpdate && "(Optional)"}
                    </FieldLabel>
                    <PasswordInput
                      id={field.name}
                      name={field.name}
                      value={field.state.value ?? ""}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                      placeholder={
                        isUpdate ? "Leave blank to keep current" : "••••••"
                      }
                      autoComplete="current-password"
                    />
                    <p className="text-[0.8rem] text-muted-foreground text-xs mt-1">
                      {isUpdate
                        ? "Only fill this if you want to change the password."
                        : "Must be at least 6 characters."}
                    </p>
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                );
              }}
            </form.Field>
          </div>
        </form>
      </CardContent>
      <CardFooter className="justify-end gap-2 px-0 pb-0 sm:px-6 sm:pb-6 pt-4">
        <Button type="submit" form="user-form" disabled={isPending}>
          {isPending && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
          {isUpdate ? "Update User" : "Create User"}
        </Button>
      </CardFooter>
    </Card>
  );
}
