import {
  ChartBarDecreasing,
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
    },
    {
      title: "Agent",
      url: "/agents",
      icon: HatGlasses,
    },
    {
      title: "Reports",
      url: "/reports",
      icon: ChartBarDecreasing,
    },
    {
      title: "Log Analyzer",
      url: "/log-analyzer",
      icon: FileSearch,
    },
    {
      title: "Users",
      url: "#",
      icon: Users,
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
