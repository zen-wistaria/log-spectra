"use client";

import { AlertCircle } from "lucide-react";
import { useSearchParams } from "next/navigation";

const errorMessages = {
  AccountBlocked: {
    title: "Account is blocked",
    description:
      "Your account is blocked by the system, please contact administrator.",
  },
  Configuration: {
    title: "Server error",
    description: "Something went wrong, please try again later.",
  },
};

export function AuthError() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const something = searchParams.get("something");

  if (!error && !something) return null;

  let title: string | undefined;
  let description: string | undefined;
  if (error) {
    title = errorMessages[error as keyof typeof errorMessages]?.title;
    description =
      errorMessages[error as keyof typeof errorMessages]?.description;
  }
  if (something) {
    title = errorMessages[something as keyof typeof errorMessages]?.title;
    description =
      errorMessages[something as keyof typeof errorMessages]?.description;
  }

  return (
    <div className="bg-destructive/15 text-destructive mb-4 flex max-w-md items-center gap-x-2 rounded-md p-4 text-sm md:max-w-full">
      <AlertCircle className="mr-2 h-6 w-6" />
      <div>
        <h4 className="font-medium">{title}</h4>
        <p className="text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
