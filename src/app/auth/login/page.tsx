import type { Metadata } from "next";

import { Suspense } from "react";
import { getRuntimeConfig } from "@/lib/runtime-config";
import LoginForm from "../../../components/auth/login-form";

const config = getRuntimeConfig();
export const generateMetadata = (): Metadata => {
  return {
    title: `Login | ${config.appName}`,
    description: "This is page login to LogSpectra",
  };
};

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm {...config} />
    </Suspense>
  );
}
