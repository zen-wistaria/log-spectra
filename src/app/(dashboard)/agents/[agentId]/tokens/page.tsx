import type { Metadata } from "next";
import { getRuntimeConfig } from "@/lib/runtime-config";
import AgentTokensView from "./_components/view";

export async function generateMetadata(): Promise<Metadata> {
  const config = getRuntimeConfig();
  return {
    title: `Tokens | ${config.appName}`,
    description: "Manage authentication tokens for this agent.",
  };
}

export default function AgentTokensPage() {
  return <AgentTokensView />;
}
