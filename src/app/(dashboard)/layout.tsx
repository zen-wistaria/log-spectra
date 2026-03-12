import { AppSidebar } from "@/components/app-sidebar";
import { DynamicBreadcrumb } from "@/components/dynamic-breadcumb";
import Footer from "@/components/footer";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getRuntimeConfig } from "@/lib/runtime-config";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const config = getRuntimeConfig();
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar props={{ variant: "inset" }} {...config} />
      <SidebarInset>
        <SiteHeader node={<DynamicBreadcrumb />} />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            {children}
          </div>
        </div>
        <Footer {...config} />
      </SidebarInset>
    </SidebarProvider>
  );
}
