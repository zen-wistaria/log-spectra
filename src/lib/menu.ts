import {
  ChartBarDecreasing,
  FileCheck,
  FileSearch,
  // HandHelping,
  HatGlasses,
  LayoutGrid,
  // Search,
  // Settings,
  Users,
} from "lucide-react";

export const menu = {
  user: {
    name: "zen",
    email: "zen@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutGrid,
      roles: ["admin"],
    },
    {
      title: "Executive Dashboard",
      url: "/executive",
      icon: LayoutGrid,
      roles: ["none"],
    },
    {
      title: "Agent",
      url: "/agents",
      icon: HatGlasses,
      roles: ["admin"],
    },
    {
      title: "Reports",
      url: "/reports",
      icon: ChartBarDecreasing,
      roles: ["admin"],
    },
    {
      title: "Resolved",
      url: "/resolved",
      icon: FileCheck,
      roles: ["admin"],
    },
    {
      title: "Log Analyzer",
      url: "/log-analyzer",
      icon: FileSearch,
      roles: ["admin"],
    },
    {
      title: "Users",
      url: "/users",
      icon: Users,
      roles: ["admin"],
    },
  ],
  navSecondary: [
    //   {
    //     title: "Settings",
    //     url: "/settings",
    //     icon: Settings,
    //   },
    //   {
    //     title: "Get Help",
    //     url: "#",
    //     icon: HandHelping,
    //   },
    //   {
    //     title: "Search",
    //     url: "#",
    //     icon: Search,
    //   },
  ],
};
