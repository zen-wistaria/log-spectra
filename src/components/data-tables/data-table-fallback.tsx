"use client";

import { TriangleAlert } from "lucide-react";

export function DataTableFallback() {
  return (
    <div
      className="bg-destructive/5 dark:bg-destructive/10 border-destructive flex flex-1 flex-col items-center space-y-3 rounded-md border p-4 text-center"
      role="alert"
    >
      <div className="relative mb-6 h-[calc(100vh-400px)] w-64">
        <div className="relative mb-6 h-full w-64">
          <div className="flex h-full w-full items-center justify-center">
            <div className="relative">
              <div className="bg-destructive/10 dark:bg-destructive/20 h-40 w-40 rounded-full">
                <div className="flex h-full w-full items-center justify-center">
                  <TriangleAlert className="text-destructive size-20" />
                </div>
              </div>

              <div className="bg-destructive/5 dark:bg-destructive/10 absolute -top-2 -right-2 -bottom-2 -left-2 rounded-full blur-md" />
            </div>
          </div>
        </div>
      </div>
      <h2 className="mb-2 text-xl font-bold">Oops! Something went wrong</h2>
    </div>
  );
}
