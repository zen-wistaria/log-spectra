"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Flag, Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { ABUSE_CATEGORIES } from "@/lib/abuseipdb";
import { useReportAbuseIpDb } from "@/query/ip-intelligence.query";

const reportSchema = z.object({
  categories: z
    .array(z.number())
    .min(1, "Select at least one category")
    .max(30, "Select up to 30 categories"),
  comment: z.string().optional(),
});

type ReportFormValues = z.infer<typeof reportSchema>;

export function AbuseIpDbReportDialog({ ip }: { ip: string }) {
  const [open, setOpen] = useState(false);
  const { mutateAsync: reportIp, isPending } = useReportAbuseIpDb();

  const form = useForm<ReportFormValues>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      categories: [],
      comment: "",
    },
  });

  const onSubmit = async (data: ReportFormValues) => {
    try {
      const result = await reportIp({
        ip,
        categories: data.categories.join(","),
        comment: data.comment,
        timestamp: new Date().toISOString(),
      });

      if (result.success) {
        toast.success(`Successfully reported IP ${ip} to AbuseIPDB`);
        setOpen(false);
        form.reset();
      } else {
        toast.error(result.error || "Failed to report IP");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unknown error");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <Flag className="size-4 mr-2" />
          Report to AbuseIPDB
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Report IP to AbuseIPDB</DialogTitle>
          <DialogDescription>
            Report malicious activity for{" "}
            <span className="font-mono">{ip}</span> to the AbuseIPDB community.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-6 overflow-y-auto pr-2"
          >
            <FormField
              control={form.control}
              name="categories"
              render={() => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel className="text-base">Categories</FormLabel>
                    <FormDescription>
                      Select all categories that apply to this IP's activity.
                    </FormDescription>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {Object.entries(ABUSE_CATEGORIES).map(([idStr, name]) => {
                      const id = parseInt(idStr, 10);
                      return (
                        <FormField
                          key={id}
                          control={form.control}
                          name="categories"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={id}
                                className="flex flex-row items-start space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(id)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...field.value, id])
                                        : field.onChange(
                                            field.value?.filter(
                                              (value) => value !== id,
                                            ),
                                          );
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal text-sm leading-none cursor-pointer">
                                  {name}
                                </FormLabel>
                              </FormItem>
                            );
                          }}
                        />
                      );
                    })}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="comment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Comment (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the malicious activity (e.g., SSH login attempts with user root)"
                      className="resize-none h-20"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Do not include personally identifiable information (PII).
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isPending && <Loader2 className="size-4 mr-2 animate-spin" />}
                Submit Report
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
