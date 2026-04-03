"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, RefreshCcw, Save, Webhook } from "lucide-react";
import { toast } from "sonner";

import { regenerateLeadAutomationSecretAction, saveLeadAutomationConfigAction } from "@/app/dashboard/settings/lead-automation/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

type AgentOption = {
  id: string;
  name: string;
};

type PhoneNumberOption = {
  phoneNumber: string;
  label: string;
};

type LeadAutomationSettingsProps = {
  webhookUrl: string;
  tenantId: string;
  initialEnabled: boolean;
  initialAgentId: string | null;
  initialFromNumber: string | null;
  initialWebhookSecret: string | null;
  agents: AgentOption[];
  phoneNumbers: PhoneNumberOption[];
};

function buildPayloadExample() {
  return JSON.stringify(
    {
      phoneNumber: "+919876543210",
      leadId: "meta-lead-001",
      adId: "123456789",
      adName: "Lead Form Campaign",
      campaignId: "campaign_001",
      formId: "form_001",
      pageId: "page_001",
    },
    null,
    2
  );
}

export function LeadAutomationSettings({
  webhookUrl,
  tenantId,
  initialEnabled,
  initialAgentId,
  initialFromNumber,
  initialWebhookSecret,
  agents,
  phoneNumbers,
}: LeadAutomationSettingsProps) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [agentId, setAgentId] = useState(initialAgentId ?? "");
  const [fromNumber, setFromNumber] = useState(initialFromNumber ?? "");
  const [webhookSecret, setWebhookSecret] = useState(initialWebhookSecret ?? "");
  const [isSaving, startSaving] = useTransition();
  const [isRegenerating, startRegenerating] = useTransition();

  const setupComplete = enabled && Boolean(agentId) && Boolean(fromNumber) && Boolean(webhookSecret);
  const samplePayload = useMemo(() => buildPayloadExample(), []);

  const copyText = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied to clipboard`);
    } catch {
      toast.error(`Failed to copy ${label.toLowerCase()}`);
    }
  };

  const handleSave = () => {
    startSaving(async () => {
      try {
        const formData = new FormData();
        formData.set("enabled", enabled ? "true" : "false");
        if (agentId) formData.set("agentId", agentId);
        if (fromNumber) formData.set("fromNumber", fromNumber);

        await saveLeadAutomationConfigAction(formData);
        toast.success("Lead automation settings saved");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to save lead automation settings");
      }
    });
  };

  const handleRegenerate = () => {
    startRegenerating(async () => {
      try {
        const nextSecret = await regenerateLeadAutomationSecretAction();
        setWebhookSecret(nextSecret);
        toast.success("Webhook secret regenerated");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to regenerate webhook secret");
      }
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Lead Automation
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            Configure one default agent and caller ID for ad leads in this workspace. Your automation tool only needs the webhook URL, secret, and lead details.
          </p>
        </div>
        <Badge
          variant="outline"
          className={
            setupComplete
              ? "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950/40 dark:text-green-300"
              : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
          }
        >
          {setupComplete ? "Ready for n8n/Zapier" : "Setup needed"}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="rounded-3xl border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <CardHeader className="px-6 pt-6">
            <CardTitle className="flex items-center gap-2 text-lg font-bold text-zinc-900 dark:text-zinc-100">
              <Webhook className="h-5 w-5 text-zinc-500" />
              Workspace Defaults
            </CardTitle>
            <CardDescription>
              Tenants should set this once. The webhook will use these defaults automatically for every incoming lead.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 px-6 pb-6">
            <div className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/60">
              <div>
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Enable lead automation</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  When enabled, requests signed with this workspace secret can trigger outbound calls.
                </p>
              </div>
              <Switch checked={enabled} onCheckedChange={setEnabled} />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Default Agent</Label>
                <Select value={agentId} onValueChange={setAgentId}>
                  <SelectTrigger className="h-11 w-full rounded-xl border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
                    <SelectValue placeholder={agents.length ? "Select agent" : "No agents available"} />
                  </SelectTrigger>
                  <SelectContent>
                    {agents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  This local NexFlow agent is mapped to the correct calling provider configuration behind the scenes.
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">Default Caller ID</Label>
                <Select value={fromNumber} onValueChange={setFromNumber}>
                  <SelectTrigger className="h-11 w-full rounded-xl border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
                    <SelectValue placeholder={phoneNumbers.length ? "Select number" : "No tenant numbers available"} />
                  </SelectTrigger>
                  <SelectContent>
                    {phoneNumbers.map((number) => (
                      <SelectItem key={number.phoneNumber} value={number.phoneNumber}>
                        {number.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  This is the tenant-owned Twilio/Plivo number shown as the outbound caller ID.
                </p>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-[1fr_auto]">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Webhook Secret</Label>
                <Input
                  readOnly
                  value={webhookSecret || "Generate and save the config to create a secret"}
                  className="h-11 rounded-xl border-zinc-200 bg-zinc-50 font-mono text-xs dark:border-zinc-800 dark:bg-zinc-900/60"
                />
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Use this as the value of the <code>x-ads-webhook-secret</code> header in n8n, Zapier, or Pabbly.
                </p>
              </div>
              <div className="flex items-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void copyText("Webhook secret", webhookSecret)}
                  disabled={!webhookSecret}
                  className="h-11 rounded-xl"
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleRegenerate}
                  disabled={isRegenerating}
                  className="h-11 rounded-xl"
                >
                  <RefreshCcw className={`mr-2 h-4 w-4 ${isRegenerating ? "animate-spin" : ""}`} />
                  {webhookSecret ? "Regenerate" : "Generate"}
                </Button>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-[1fr_auto]">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Webhook URL</Label>
                <Input
                  readOnly
                  value={webhookUrl}
                  className="h-11 rounded-xl border-zinc-200 bg-zinc-50 font-mono text-xs dark:border-zinc-800 dark:bg-zinc-900/60"
                />
              </div>
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void copyText("Webhook URL", webhookUrl)}
                  className="h-11 rounded-xl"
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy
                </Button>
              </div>
            </div>

            <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/40">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
                Advanced
              </p>
              <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-300">
                Tenant ID: <span className="font-mono">{tenantId}</span>
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                You usually do not need this in n8n anymore because the secret now resolves the workspace automatically.
              </p>
            </div>

            <Button
              type="button"
              onClick={handleSave}
              disabled={isSaving || !agents.length || !phoneNumbers.length}
              className="h-11 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? "Saving..." : "Save Configuration"}
            </Button>

            {(!agents.length || !phoneNumbers.length) && (
              <p className="text-xs text-amber-600 dark:text-amber-300">
                Add at least one agent and one tenant phone number before enabling this integration.
              </p>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="rounded-3xl border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <CardHeader className="px-6 pt-6">
              <CardTitle className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                n8n Request Example
              </CardTitle>
              <CardDescription>
                Once the tenant has saved a default agent and caller ID, the external workflow only needs to send lead details.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 px-6 pb-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">Headers</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      void copyText(
                        "Header example",
                        JSON.stringify({ "x-ads-webhook-secret": webhookSecret || "<workspace-secret>" }, null, 2)
                      )
                    }
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copy
                  </Button>
                </div>
                <pre className="overflow-x-auto rounded-2xl bg-zinc-950 p-4 text-xs text-zinc-100">
{`{
  "x-ads-webhook-secret": "${webhookSecret || "<workspace-secret>"}"
}`}
                </pre>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">JSON Body</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => void copyText("Sample JSON payload", samplePayload)}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copy
                  </Button>
                </div>
                <pre className="overflow-x-auto rounded-2xl bg-zinc-950 p-4 text-xs text-zinc-100">
                  {samplePayload}
                </pre>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <CardHeader className="px-6 pt-6">
              <CardTitle className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                Tenant Setup Checklist
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 px-6 pb-6 text-sm text-zinc-600 dark:text-zinc-300">
              <p>1. Connect Twilio or Plivo in Providers.</p>
              <p>2. Make sure the calling number is visible in this tenant&apos;s Phone Numbers page.</p>
              <p>3. Select the agent that should handle every new ad lead.</p>
              <p>4. Save the configuration and copy the webhook URL plus secret into n8n.</p>
              <p>5. Send a test lead with a new <code>leadId</code> every time so duplicate protection does not skip it.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
