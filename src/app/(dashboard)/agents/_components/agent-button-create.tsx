"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import Modal from "@/components/modal";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import AgentCreateForm from "./agent-form-create";

export default function AgentCreateButton() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button onClick={() => setIsAddModalOpen(true)}>
            <Plus className="size-4" aria-hidden="true" />
            <span className="hidden md:inline">Create Agent</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent className="md:hidden" align="end">
          <p>Create Agent</p>
        </TooltipContent>
      </Tooltip>
      <Modal
        title="New Agent"
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      >
        <AgentCreateForm onSuccess={() => setIsAddModalOpen(false)} />
      </Modal>
    </>
  );
}
