import {
  Activity,
  Clock,
  Cpu,
  Globe,
  HatGlasses,
  Key,
  Server,
  ServerCog,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { AgentService } from "@/services/agent.service";

export default async function AgentPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const id = (await params).agentId;
  const agent = await AgentService.getAgentById(id);

  const formatDate = (date?: Date | null) =>
    date ? new Date(date).toLocaleString() : "-";

  return (
    <Card className="min-w-[80%] m-auto">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Server className="w-5 h-5" />
          Agent Detail
        </CardTitle>

        <Badge variant={agent?.status === "online" ? "default" : "secondary"}>
          {agent?.status ?? "unknown"}
        </Badge>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Basic Info */}
        <div>
          <h3 className="text-sm font-semibold mb-3 text-muted-foreground">
            Basic Information
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <Info label="Agent ID" value={id} icon={<Key size={16} />} />
            <Info
              label="Name"
              value={agent?.name}
              icon={<Server size={16} />}
            />
            <Info label="Description" value={agent?.description} />
          </div>
        </div>

        <Separator />

        {/* System Info */}
        <div>
          <h3 className="text-sm font-semibold mb-3 text-muted-foreground">
            System Information
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <Info
              label="Hostname"
              value={agent?.hostname}
              icon={<Server size={16} />}
            />
            <Info
              label="IP Address"
              value={agent?.ip_address}
              icon={<Globe size={16} />}
            />
            <Info
              label="Operating System"
              value={agent?.os}
              icon={<Cpu size={16} />}
            />
            <Info
              label="Machine ID"
              icon={<ServerCog size={16} />}
              value={agent?.machine_id}
            />
            <Info
              label="Agent Version"
              icon={<HatGlasses size={16} />}
              value={agent?.version}
            />
          </div>
        </div>

        <Separator />

        {/* Metrics */}
        <div>
          <h3 className="text-sm font-semibold mb-3 text-muted-foreground">
            Metrics
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex flex-col items-start gap-2">
              <Info
                label="Collected Anomaly Logs"
                value={agent?._count?.anomaly_logs}
                icon={<Activity size={16} />}
              />
              <Button variant="outline" size="sm" asChild>
                <Link href={`/reports?agentId=${id}`}>View Logs</Link>
              </Button>
            </div>
            <div className="flex flex-col items-start gap-2">
              <Info
                label="Total Tokens"
                value={agent?._count?.tokens}
                icon={<Key size={16} />}
              />
              <Button variant="outline" size="sm" asChild>
                <Link href={`/agents/${id}/tokens`}>View Tokens</Link>
              </Button>
            </div>
          </div>
        </div>

        <Separator />

        {/* Time Info */}
        <div>
          <h3 className="text-sm font-semibold mb-3 text-muted-foreground">
            Time Information
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <Info
              label="Last Seen"
              value={formatDate(agent?.last_seen)}
              icon={<Clock size={16} />}
            />
            <Info
              label="Created At"
              value={formatDate(agent?.created_at)}
              icon={<Clock size={16} />}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Info({
  label,
  value,
  icon,
  className,
}: {
  label: string;
  value?: string | number | Date | null | undefined;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={"flex items-start gap-2"}>
      {icon && <div className="text-muted-foreground mt-0.5">{icon}</div>}

      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={cn("font-medium mt-1", className)}>
          {String(value ?? "-")}
        </p>
      </div>
    </div>
  );
}
