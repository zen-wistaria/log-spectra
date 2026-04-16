import { Loader2 } from "lucide-react";
import { signOut } from "next-auth/react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  ResponsiveDialog,
  ResponsiveDialogClose,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";

export default function SignOutDialog({
  isOpen,
  setIsOpen,
}: {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}) {
  const [isPending, setIsPending] = useState(false);

  const onSubmit = async () => {
    try {
      setIsPending(true);
      await signOut({ redirect: false });
      window.location.href = "/auth/login";
    } catch (e) {
      if (e instanceof Error) {
        toast.error("Internal server error");
      }
      setIsOpen(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
  };

  return (
    <ResponsiveDialog open={isOpen} onOpenChange={handleOpenChange}>
      <ResponsiveDialogContent className="sm:max-w-[425px]">
        <ResponsiveDialogHeader className="text-left">
          <ResponsiveDialogTitle>Log Out</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Are you sure want to log out ?
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <div className="flex w-full flex-col gap-4 px-4 sm:px-0">
          <ResponsiveDialogFooter className="flex flex-col-reverse px-0 pt-0 sm:flex-row">
            <ResponsiveDialogClose asChild>
              <Button
                variant="outline"
                type="button"
                className="focus-visible:ring-0 focus-visible:outline-none"
              >
                Cancel
              </Button>
            </ResponsiveDialogClose>
            <Button
              variant="destructive"
              disabled={isPending}
              type="button"
              onClick={() => onSubmit()}
            >
              {isPending && <Loader2 className="size-4 animate-spin" />}
              {isPending ? "Logging out..." : "Yes"}
            </Button>
          </ResponsiveDialogFooter>
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
