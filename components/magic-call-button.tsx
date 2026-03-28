"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, PhoneCall } from "lucide-react";
import { toast } from "sonner"; // Assuming modern shadcn/ui toast or sonner is installed

interface MagicCallButtonProps {
  agentId: string;
  tenantId: string;
}

export function MagicCallButton({ agentId, tenantId }: MagicCallButtonProps) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleTriggerCall = async () => {
    if (!phoneNumber) {
      toast.error("Please enter a valid phone number");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/calls/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber, agentId, tenantId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to trigger call");
      }

      toast.success("AI Call Triggered Successfully! 🤖");
      setPhoneNumber(""); // Reset on optimistic success
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "An error occurred";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex w-full max-w-sm items-center space-x-2">
      <Input
        type="tel"
        placeholder="+1 (555) 000-0000"
        value={phoneNumber}
        onChange={(e) => setPhoneNumber(e.target.value)}
        disabled={isLoading}
      />
      <Button 
        onClick={handleTriggerCall} 
        disabled={isLoading || !phoneNumber}
        className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
      >
        {isLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <PhoneCall className="mr-2 h-4 w-4" />
        )}
        Trigger AI Call
      </Button>
    </div>
  );
}
