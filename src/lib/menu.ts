import {
  ChartBarDecreasing,
  HandHelping,
  HatGlasses,
  LayoutGrid,
  Search,
  Settings,
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
      title: "Log Analysis",
      url: "/log-analysis",
      icon: ChartBarDecreasing,
    },
    {
      title: "Users",
      url: "#",
      icon: Users,
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "/settings",
      icon: Settings,
    },
    {
      title: "Get Help",
      url: "#",
      icon: HandHelping,
    },
    {
      title: "Search",
      url: "#",
      icon: Search,
    },
  ],
};
