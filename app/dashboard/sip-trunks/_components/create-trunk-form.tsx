"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Info, Network, Link as LinkIcon, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createSipTrunkAction } from "@/app/dashboard/sip-trunks/actions";
import { SubmitButton } from "./submit-button";

export function CreateTrunkForm() {
  const router = useRouter();
  const [provider, setProvider] = useState("custom");

  return (
    <form 
      action={async (formData) => {
        const res = await createSipTrunkAction(formData);
        if (res?.error) {
          toast.error(res.error);
        } else {
          toast.success("SIP Trunk created successfully!");
          router.push("/dashboard/sip-trunks");
        }
      }} 
      className="space-y-8 animate-in fade-in duration-500"
    >
      {/* Basic Settings */}
      <div className="space-y-6 rounded-2xl border border-zinc-200 bg-white p-6 md:p-8 dark:border-zinc-800 dark:bg-zinc-950/50">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
          <Network className="h-5 w-5 text-zinc-500" />
          General Information
        </h3>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-semibold text-zinc-900 dark:text-zinc-300">
              Trunk Name <span className="text-red-500">*</span>
            </Label>
            <Input id="name" name="name" placeholder="e.g. My Twilio Route" required className="h-11 bg-zinc-50/50 dark:bg-zinc-900/50" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="provider" className="text-sm font-semibold text-zinc-900 dark:text-zinc-300">
              Provider
            </Label>
            <Select name="provider" value={provider} onValueChange={setProvider}>
              <SelectTrigger className="h-11 bg-zinc-50/50 dark:bg-zinc-900/50">
                <SelectValue placeholder="Select Provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="twilio">Twilio Elastic SIP</SelectItem>
                <SelectItem value="plivo">Plivo Zentrunk</SelectItem>
                <SelectItem value="custom">Generic / Custom SIP</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Auth Settings */}
      <div className="space-y-6 rounded-2xl border border-zinc-200 bg-white p-6 md:p-8 dark:border-zinc-800 dark:bg-zinc-950/50">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-zinc-500" />
          Authentication & Domain
        </h3>

        {/* Twilio Auth */}
        {provider === "twilio" && (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="accountSid" className="text-sm font-semibold text-zinc-900 dark:text-zinc-300">
                Account SID <span className="text-red-500">*</span>
              </Label>
              <Input id="accountSid" name="accountSid" required placeholder="ACxxxxxxxxxxxxx" className="h-11 bg-zinc-50/50 dark:bg-zinc-900/50" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="authToken" className="text-sm font-semibold text-zinc-900 dark:text-zinc-300">
                Auth Token
              </Label>
              <Input id="authToken" name="authToken" type="password" placeholder="••••••••••••••••" className="h-11 bg-zinc-50/50 dark:bg-zinc-900/50" />
            </div>
          </div>
        )}

        {/* Plivo Auth */}
        {provider === "plivo" && (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="authId" className="text-sm font-semibold text-zinc-900 dark:text-zinc-300">
                Auth ID <span className="text-red-500">*</span>
              </Label>
              <Input id="authId" name="authId" required placeholder="MAXxxxxxxxxxxx" className="h-11 bg-zinc-50/50 dark:bg-zinc-900/50" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="authToken" className="text-sm font-semibold text-zinc-900 dark:text-zinc-300">
                Auth Token
              </Label>
              <Input id="authToken" name="authToken" type="password" placeholder="••••••••••••••••" className="h-11 bg-zinc-50/50 dark:bg-zinc-900/50" />
            </div>
          </div>
        )}

        {/* Custom Auth */}
        {provider === "custom" && (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="sipUsername" className="text-sm font-semibold text-zinc-900 dark:text-zinc-300">
                SIP Username
              </Label>
              <Input id="sipUsername" name="sipUsername" placeholder="e.g. nexflow-agent" className="h-11 bg-zinc-50/50 dark:bg-zinc-900/50" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sipPassword" className="text-sm font-semibold text-zinc-900 dark:text-zinc-300">
                SIP Password
              </Label>
              <Input id="sipPassword" name="sipPassword" type="password" placeholder="••••••••••••" className="h-11 bg-zinc-50/50 dark:bg-zinc-900/50" />
            </div>
          </div>
        )}

        {/* Domain */}
        <div className="space-y-2 pt-4 border-t border-zinc-100 dark:border-zinc-800">
          <Label htmlFor="sipDomain" className="text-sm font-semibold text-zinc-900 dark:text-zinc-300">
            SIP Domain (Hostname)
          </Label>
          <Input id="sipDomain" name="sipDomain" placeholder={provider === "twilio" ? "e.g. my-company" : "e.g. sip.provider.com"} className="h-11 bg-zinc-50/50 dark:bg-zinc-900/50" />
          <p className="text-xs text-zinc-500 mt-2">
             {provider === "twilio" ? "Just the subdomain (e.g. my-trunk), or full domain if using a custom BYOC endpoint." : 
              provider === "plivo" ? "Typically ending in plivo.com." : 
              "The registrar host or outbound proxy domain."}
          </p>
        </div>
      </div>

      {/* Network / URIs */}
      <div className="space-y-6 rounded-2xl border border-zinc-200 bg-white p-6 md:p-8 dark:border-zinc-800 dark:bg-zinc-950/50">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
          <LinkIcon className="h-5 w-5 text-zinc-500" />
          Routing URIs
        </h3>
        
        <Alert className="bg-orange-50/50 text-orange-900 border-orange-200 dark:bg-orange-950/20 dark:text-orange-200 dark:border-orange-900/50 rounded-xl">
          <Info className="h-4 w-4 text-orange-600 dark:text-orange-400 mt-0.5" />
          <AlertDescription className="ml-2 font-medium">
            At least one URI (or the SIP Domain above) must be provided. NexFlow requires URIs to establish communication channels.
          </AlertDescription>
        </Alert>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="inboundUrl" className="text-sm font-semibold text-zinc-900 dark:text-zinc-300">
              Inbound URI
            </Label>
            <Input id="inboundUrl" name="inboundUrl" placeholder="sip:inbound@..." className="h-11 bg-zinc-50/50 dark:bg-zinc-900/50" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="outboundUrl" className="text-sm font-semibold text-zinc-900 dark:text-zinc-300">
              Outbound URI
            </Label>
            <Input id="outboundUrl" name="outboundUrl" placeholder="sip:outbound@..." className="h-11 bg-zinc-50/50 dark:bg-zinc-900/50" />
            <p className="text-xs text-zinc-500 mt-2">
              If left blank on {provider === "custom" ? "custom provider" : provider}, NexFlow auto-constructs this using the SIP Domain.
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <SubmitButton>Create SIP Trunk</SubmitButton>
      </div>
    </form>
  );
}
