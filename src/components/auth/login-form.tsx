"use client";

import { useForm } from "@tanstack/react-form";
import { AudioWaveform, Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useRouter } from "nextjs-toploader/app";
import { toast } from "sonner";
import ThemeSwitch from "@/components/theme-switch";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { type LoginSchema, loginSchema } from "@/schema/login.schema";
import { Field, FieldDescription, FieldError, FieldLabel } from "../ui/field";
import { PasswordInput } from "../ui/password-input";
import { AuthError } from "./auth-error";

export default function LoginForm({
  appName = "LogSpectra",
  appCopyright = "Zen",
  appCopyrightYear = "2026",
}: {
  appName?: string;
  appCopyright?: string;
  appCopyrightYear?: string;
}) {
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") || "/dashboard";
  const router = useRouter();

  const form = useForm({
    defaultValues: {
      username: "",
      password: "",
    } as LoginSchema,
    validators: {
      onChange: loginSchema,
    },
    onSubmit: async ({ value }) => {
      try {
        const res = await signIn("credentials", {
          ...value,
          redirect: false,
          callbackUrl,
        });

        if (!res?.ok) {
          toast.error("Username or password is wrong!!");
        } else {
          if (callbackUrl === "/") {
            router.push("/dashboard");
          } else {
            router.push(callbackUrl);
          }
        }
      } catch (error) {
        toast.error("Error", { description: (error as Error).message });
      }
    },
  });

  return (
    <div className="flex h-screen flex-col items-center justify-center">
      <div className="absolute top-4 right-4">
        <ThemeSwitch />
      </div>
      <div>
        <AuthError />
        <div className="flex flex-row overflow-hidden rounded-md border-2">
          <div className="bg-foreground hidden min-h-full w-90 flex-col items-center justify-center md:flex">
            <div className="flex flex-1 items-center justify-center">
              <AudioWaveform className="w-24 h-24 text-background" />
            </div>
            <div className="pb-4">
              <span className="text-background text-sm">
                {appCopyright} &copy; {appCopyrightYear}
              </span>
            </div>
          </div>
          <Card className="flex max-w-sm flex-row justify-between rounded-none border-none px-2 md:min-w-md md:px-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                form.handleSubmit();
              }}
              className="w-full"
            >
              <CardHeader className="mb-8 text-center">
                <CardTitle className="text-2xl">
                  Wellcome to {appName}
                </CardTitle>
                <CardDescription className="text-xl">
                  Sign in to continue
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <form.Field name="username">
                  {(field) => {
                    const isInvalid =
                      field.state.meta.isTouched &&
                      field.state.meta.errors.length > 0;
                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>Username</FieldLabel>
                        <div className="flex flex-col gap-1">
                          <Input
                            placeholder="Input email/username"
                            id={field.name}
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            aria-invalid={isInvalid}
                            autoComplete="username"
                            autoFocus
                          />
                          {isInvalid && (
                            <FieldError errors={field.state.meta.errors} />
                          )}
                          <FieldDescription className="text-xs text-muted-foreground">
                            Input your username.
                          </FieldDescription>
                        </div>
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
                        <FieldLabel htmlFor={field.name}>Password</FieldLabel>
                        <div className="flex flex-col gap-1">
                          <PasswordInput
                            placeholder="Input password"
                            id={field.name}
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            aria-invalid={isInvalid}
                            autoComplete="current-password"
                            autoFocus
                          />
                          {isInvalid && (
                            <FieldError errors={field.state.meta.errors} />
                          )}
                          <FieldDescription className="text-xs text-muted-foreground">
                            Input your password.
                          </FieldDescription>
                        </div>
                      </Field>
                    );
                  }}
                </form.Field>
              </CardContent>
              <CardFooter className="flex justify-end">
                <CardAction className="z-10">
                  <form.Subscribe selector={(state) => state.isSubmitting}>
                    {(isSubmitting) => {
                      return (
                        <Button type="submit" disabled={isSubmitting}>
                          {isSubmitting ? (
                            <>
                              Signing
                              <Loader2 className="animate-spin" />
                            </>
                          ) : (
                            "Sign in"
                          )}
                        </Button>
                      );
                    }}
                  </form.Subscribe>
                </CardAction>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
