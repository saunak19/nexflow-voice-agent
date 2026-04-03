import { Trash2, KeyRound } from "lucide-react";
import { Role } from "@prisma/client";

import { auth } from "@/lib/auth";
import { requireTenantRole } from "@/lib/authorization";
import { AccessDeniedState } from "@/components/access-denied-state";
import { Button } from "@/components/ui/button";
import { getCurrentTenantId } from "@/lib/tenant";
import { listTenantProviderConfigs } from "@/lib/tenant-provider-configs";
import { listTenantPhoneNumbers } from "@/lib/tenant-phone-numbers";

import { deleteProviderAction } from "./actions";
import { ProviderCard, ProviderDef } from "./_components/provider-card";

const AVAILABLE_PROVIDERS: ProviderDef[] = [
  {
    id: "twilio",
    name: "Twilio",
    description: "Connect your Twilio account to handle inbound and outbound telephony infrastructure.",
    keys: [
      { name: "TWILIO_ACCOUNT_SID", label: "Account SID" },
      { name: "TWILIO_AUTH_TOKEN", label: "Auth Token", type: "password" },
      { name: "TWILIO_PHONE_NUMBER", label: "Twilio Phone Number" },
    ],
  },
  {
    id: "plivo",
    name: "Plivo",
    description: "Connect your Plivo account to handle inbound and outbound telephony with a separate number pool.",
    keys: [
      { name: "PLIVO_AUTH_ID", label: "Auth ID" },
      { name: "PLIVO_AUTH_TOKEN", label: "Auth Token", type: "password" },
      { name: "PLIVO_PHONE_NUMBER", label: "Plivo Phone Number" },
    ],
  },
  {
    id: "openai",
    name: "OpenAI",
    description: "Power your agents with GPT-4 turbo and advanced language reasoning models.",
    keys: [{ name: "OPENAI_API_KEY", label: "OpenAI API Key", type: "password" }],
  },
  {
    id: "sarvam",
    name: "Sarvam AI",
    description: "Next-gen Indian language models for incredibly realistic multilingual voice synthesis.",
    keys: [{ name: "SARVAM_API_KEY", label: "Sarvam API Key", type: "password" }],
  },
  {
    id: "elevenlabs",
    name: "ElevenLabs",
    description: "Ultra-realistic voice synthesis and voice cloning for personalized agent personalities.",
    keys: [{ name: "ELEVENLABS_API_KEY", label: "ElevenLabs API Key", type: "password" }],
  },
  {
    id: "deepgram",
    name: "Deepgram",
    description: "High-speed, accurate speech-to-text models specialized for conversational agents.",
    keys: [{ name: "DEEPGRAM_AUTH_TOKEN", label: "Deepgram Auth Token", type: "password" }],
  },
];

export default async function ProvidersPage() {
  try {
    const session = await auth();
    await requireTenantRole(session, Role.ADMIN);
    const tenantId = await getCurrentTenantId(session);
    const [connectedKeys, tenantPhoneNumbers] = await Promise.all([
      listTenantProviderConfigs(tenantId).catch(() => []),
      listTenantPhoneNumbers(tenantId).catch(() => []),
    ]);
    const configuredKeyNames = new Set(connectedKeys.map((config) => config.provider_name));

    for (const phoneNumber of tenantPhoneNumbers) {
      if (phoneNumber.telephony_provider?.toLowerCase() === "twilio") {
        configuredKeyNames.add("TWILIO_PHONE_NUMBER");
      }
      if (phoneNumber.telephony_provider?.toLowerCase() === "plivo") {
        configuredKeyNames.add("PLIVO_PHONE_NUMBER");
      }
    }

    return (
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 animate-in fade-in duration-500 pb-20">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Integrations & Providers
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            Connect your favorite external services for LLMs, voice providers, and telephony for this
            workspace. Saved keys shown below are scoped to the current tenant in NexFlow.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {AVAILABLE_PROVIDERS.map((provider) => (
            <ProviderCard
              key={provider.id}
              provider={provider}
              configuredKeys={provider.keys
                .filter((key) => configuredKeyNames.has(key.name))
                .map((key) => key.name)}
            />
          ))}
        </div>

        <div className="border-t border-zinc-200 pt-8 dark:border-zinc-800">
          <h2 className="mb-6 flex items-center gap-2 text-xl font-bold text-zinc-900 dark:text-zinc-100">
            <KeyRound className="h-5 w-5 text-zinc-400" />
            Active Configurations
          </h2>

          {connectedKeys.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-zinc-200 bg-zinc-50 p-10 text-center dark:border-zinc-800 dark:bg-zinc-900/40">
              <p className="text-sm font-medium text-zinc-500">
                No active keys synced. Start connecting a provider above.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {connectedKeys.map((config) => (
                <div
                  key={`${config.tenant_id}-${config.provider_name}`}
                  className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950"
                >
                  <div>
                    <p className="mb-0.5 text-sm font-bold text-zinc-900 dark:text-zinc-100">
                      {config.provider_name}
                    </p>
                    <p className="max-w-[200px] truncate font-mono text-xs text-zinc-500">
                      {config.provider_name.includes("PHONE_NUMBER")
                        ? config.provider_value
                        : "****************"}
                    </p>
                  </div>
                  <form action={deleteProviderAction}>
                    <input type="hidden" name="provider_name" value={config.provider_name} />
                    <Button
                      type="submit"
                      variant="ghost"
                      size="icon"
                      className="group h-9 w-9 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/30"
                    >
                      <Trash2 className="h-4 w-4 transition-transform group-hover:scale-110" />
                    </Button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  } catch (error) {
    if (error instanceof Error && error.message === "Forbidden") {
      return (
        <AccessDeniedState
          title="Provider Settings Restricted"
          description="Only workspace admins and owners can manage provider credentials, telephony numbers, and provider integrations."
        />
      );
    }

    throw error;
  }
}
