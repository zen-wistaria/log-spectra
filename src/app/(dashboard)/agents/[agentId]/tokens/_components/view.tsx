"use client";

import { ChevronLeft, PlusIcon } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import Modal from "@/components/modal";
import { Button } from "@/components/ui/button";
import { useAgents } from "@/query/agent.query";
import TokenCreateForm from "./token-form-create";
import { TokensTable } from "./tokens-table";

export default function AgentTokensView() {
  const params = useParams();
  const agentId = params.agentId as string;
  const { data: agents } = useAgents({
    page: 1,
    limit: 100,
    search: "",
    sort: "",
  });
  const agent = agents?.data.find((a) => a.id === agentId);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/agents">
              <ChevronLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Tokens for Agent {agent?.name || "Agent"}
            </h2>
            <p className="text-muted-foreground">
              Manage authentication tokens for{" "}
              <strong>{agent?.hostname || agentId}</strong>
            </p>
          </div>
          <div className="ml-auto">
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <PlusIcon className="mr-2 h-4 w-4" />
              Create Token
            </Button>
          </div>
        </div>

        <TokensTable agentId={agentId} />

        <Modal
          title="Create New Token"
          description="Generate a new access token for this agent."
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
        >
          <TokenCreateForm
            agentId={agentId}
            onSuccess={() => setIsCreateModalOpen(false)}
          />
        </Modal>
      </div>
    </div>
  );
}
