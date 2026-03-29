"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, PhoneCall, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface MagicCallButtonProps {
  agentId: string;
  tenantId: string;
  fromNumber?: string;
  userData?: Record<string, string | number | boolean>;
}

interface TriggerCallResult {
  success: boolean;
  callId?: string;
  bolnaCallId?: string;
  error?: string;
}

export function MagicCallButton({
  agentId,
  tenantId,
  fromNumber,
  userData,
}: MagicCallButtonProps) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [lastCallId, setLastCallId] = useState<string | null>(null);

  const handleTriggerCall = async () => {
    if (!phoneNumber.trim()) {
      toast.error("Please enter a valid phone number");
      return;
    }

    setIsLoading(true);
    setLastCallId(null);

    try {
      const response = await fetch("/api/calls/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: phoneNumber.trim(),
          agentId,
          tenantId,
          fromNumber,
          userData,
        }),
      });

      const data = (await response.json()) as TriggerCallResult;

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to trigger call");
      }

      if (data.bolnaCallId) {
        setLastCallId(data.callId ?? null);
        toast.success(`Call connected! Bolna ID: ${data.bolnaCallId}`, {
          duration: 6000,
        });
      }

      setPhoneNumber("");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "An error occurred";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex w-full items-center space-x-2">
        <Input
          type="tel"
          placeholder="+1 (555) 000-0000"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          disabled={isLoading}
          className="flex-1"
        />
        <Button
          onClick={handleTriggerCall}
          disabled={isLoading || !phoneNumber.trim()}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shrink-0"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Connecting…
            </>
          ) : (
            <>
              <PhoneCall className="mr-2 h-4 w-4" />
              Call
            </>
          )}
        </Button>
      </div>

      {lastCallId && (
        <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span>Call initiated.</span>
          <Link
            href={`/dashboard/calls/${lastCallId}`}
            className="font-semibold underline underline-offset-2"
          >
            View in history →
          </Link>
        </div>
      )}
    </div>
  );
}
