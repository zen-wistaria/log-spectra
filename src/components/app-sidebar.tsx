"use client";

import { AudioWaveform } from "lucide-react";
import Link from "next/link";
import type * as React from "react";
import { NavMain } from "@/components/nav-main";
import { NavSecondary } from "@/components/nav-secondary";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { menu } from "@/lib/menu";

export function AppSidebar({
  props,
  appName,
  appAuthor,
}: {
  props: React.ComponentProps<typeof Sidebar>;
  appName: string;
  appAuthor: string;
}) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <Link href="/" className="h-full">
                <div className="flex justify-between items-center gap-4 ml-1.5">
                  <AudioWaveform className="size-5 scale-150" />
                  <div className="flex flex-col">
                    <span className="text-base font-semibold font-mono">
                      {appName}
                    </span>
                    <span className="text-xs font-mono font-thin">
                      by <strong>{appAuthor}</strong>
                    </span>
                  </div>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={menu.navMain} />
        <NavSecondary items={menu.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={menu.user} />
      </SidebarFooter>
    </Sidebar>
  );
}
