import type { Metadata } from "next";

import { Suspense } from "react";
import { getRuntimeConfig } from "@/lib/runtime-config";
import LoginForm from "../../../components/auth/login-form";

export const generateMetadata = (): Metadata => {
  const config = getRuntimeConfig();
  return {
    title: `Login | ${config.appName}`,
    description: "This is page login to LogSpectra",
  };
};

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
