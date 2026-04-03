"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, PhoneCall, PhoneOff } from "lucide-react";
import { toast } from "sonner";
import { makeCallAction, stopCallAction } from "@/app/dashboard/agents/actions";

interface MagicCallButtonProps {
  agentId: string;
  tenantId?: string; // Retained to preserve interface/props from consumer components
  fromNumber?: string;
  phoneNumbers?: { phone_number: string }[];
  userData?: Record<string, string | number | boolean>;
}

export function MagicCallButton({
  agentId,
  phoneNumbers = [],
}: MagicCallButtonProps) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [fromPhoneNumber, setFromPhoneNumber] = useState<string>("");
  const [status, setStatus] = useState<"idle" | "dialing" | "active" | "stopping">("idle");
  const [activeExecutionId, setActiveExecutionId] = useState<string | null>(null);

  const handleCall = async () => {
    if (phoneNumbers.length > 0 && !fromPhoneNumber) {
      toast.error("Please select a valid 'From Number'");
      return;
    }

    if (!phoneNumber.trim()) {
      toast.error("Please enter a valid recipient phone number");
      return;
    }

    setStatus("dialing");
    
    // Pass fromPhoneNumber to the action
    const result = await makeCallAction(agentId, phoneNumber, fromPhoneNumber || undefined);
    
    if (!result.success) {
      toast.error(result.error || "Failed to initiate call");
      setStatus("idle");
      return;
    }

    if (result.bolnaCallId) {
      toast.success(`Call connected! Session ID: ${result.bolnaCallId}`);
      setActiveExecutionId(result.bolnaCallId);
      setStatus("active");
      return;
    }

    toast.success("Call initiated successfully.");
    setStatus("idle");
  };

  const handleStopCall = async () => {
    if (!activeExecutionId) return;

    setStatus("stopping");
    const result = await stopCallAction(activeExecutionId);

    if (!result.success) {
      toast.error(result.error || "Failed to stop call");
      setStatus("active");
      return;
    }

    toast.success("Call ended successfully");
    setActiveExecutionId(null);
    setStatus("idle");
    setPhoneNumber("");
  };

  return (
    <div className="space-y-4 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
      <div className="space-y-2 text-sm">
        <label className="font-semibold text-zinc-700 dark:text-zinc-300">
          From Number {phoneNumbers.length > 0 && <span className="text-red-500">*</span>}
        </label>
        <Select
          value={fromPhoneNumber}
          onValueChange={setFromPhoneNumber}
          disabled={status !== "idle" || phoneNumbers.length === 0}
        >
          <SelectTrigger className="w-full rounded-xl bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
            <SelectValue placeholder={phoneNumbers.length === 0 ? "No numbers connected" : "Select caller ID..."} />
          </SelectTrigger>
          <SelectContent>
            {phoneNumbers.map((num) => (
              <SelectItem key={num.phone_number} value={num.phone_number}>
                {num.phone_number}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          Recipient
        </label>
        <div className="flex w-full items-center space-x-2">
          <Input
            type="tel"
            placeholder="+1 (555) 000-0000"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            disabled={status !== "idle"}
            className="flex-1 rounded-xl bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800"
          />
          
          {status === "idle" && (
            <Button
              onClick={handleCall}
              disabled={!phoneNumber.trim() || (phoneNumbers.length > 0 && !fromPhoneNumber)}
              className="rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200 font-semibold shrink-0 transition-colors"
            >
            <PhoneCall className="mr-2 h-4 w-4" />
            Call
          </Button>
        )}

        {status === "dialing" && (
          <Button
            disabled
            className="rounded-xl bg-amber-500 text-white hover:bg-amber-600 font-semibold shrink-0 opacity-100 transition-colors"
          >
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Dialing...
          </Button>
        )}

        {(status === "active" || status === "stopping") && (
          <Button
            onClick={handleStopCall}
            disabled={status === "stopping"}
            variant="destructive"
            className="rounded-xl font-semibold shrink-0 opacity-100 transition-colors"
          >
            {status === "stopping" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <PhoneOff className="mr-2 h-4 w-4" />
            )}
            End Call
          </Button>
        )}
        </div>
      </div>
    </div>
  );
}
