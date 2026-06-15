"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import Modal from "@/components/modal";
import { Button } from "@/components/ui/button";
import UserForm from "./user-form";

export default function UserCreateButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        Create User
      </Button>
      <Modal
        title="Create New User"
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      >
        <UserForm onSuccess={() => setIsOpen(false)} />
      </Modal>
    </>
  );
}
