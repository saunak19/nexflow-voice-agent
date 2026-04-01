"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function AgentFilter({
  agents,
  currentAgentId,
}: {
  agents: { id: string; name: string }[];
  currentAgentId: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const onChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") {
      params.set("agentId", value);
    } else {
      params.delete("agentId");
    }
    router.push(`/dashboard/batches?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-zinc-500">Filter by Agent:</span>
      <Select value={currentAgentId || "all"} onValueChange={onChange}>
        <SelectTrigger className="w-[200px] h-9">
          <SelectValue placeholder="All Agents" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Agents</SelectItem>
          {agents.map((agent) => (
            <SelectItem key={agent.id} value={agent.id}>
              {agent.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
