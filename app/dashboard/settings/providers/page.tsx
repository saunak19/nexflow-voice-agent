import { Trash2, KeyRound } from "lucide-react";
import { bolnaClient } from "@/lib/bolna-client";
import { deleteProviderAction } from "./actions";
import { Button } from "@/components/ui/button";
import { ProviderCard, ProviderDef } from "./_components/provider-card";

const AVAILABLE_PROVIDERS: ProviderDef[] = [
  {
    id: "twilio",
    name: "Twilio",
    description: "Connect your Twilio account to handle inbound and outbound telephony infrastructure.",
    keys: [
      { name: "TWILIO_ACCOUNT_SID", label: "Account SID" },
      { name: "TWILIO_AUTH_TOKEN", label: "Auth Token", type: "password" },
    ],
  },
  {
    id: "openai",
    name: "OpenAI",
    description: "Power your agents with GPT-4 turbo and advanced language reasoning models.",
    keys: [
      { name: "OPENAI_API_KEY", label: "OpenAI API Key", type: "password" },
    ],
  },
  {
    id: "sarvam",
    name: "Sarvam AI",
    description: "Next-gen Indian language models for incredibly realistic multilingual voice synthesis.",
    keys: [
      { name: "SARVAM_API_KEY", label: "Sarvam API Key", type: "password" },
    ],
  },
  {
    id: "elevenlabs",
    name: "ElevenLabs",
    description: "Ultra-realistic voice synthesis and voice cloning for personalized agent personalities.",
    keys: [
      { name: "ELEVENLABS_API_KEY", label: "ElevenLabs API Key", type: "password" },
    ],
  },
  {
    id: "deepgram",
    name: "Deepgram",
    description: "High-speed, accurate speech-to-text models specialized for conversational agents.",
    keys: [
      { name: "DEEPGRAM_AUTH_TOKEN", label: "Deepgram Auth Token", type: "password" },
    ],
  },
];

export default async function ProvidersPage() {
  const connectedKeys = await bolnaClient.listProviders().catch(() => []);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 animate-in fade-in duration-500 pb-20">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Integrations & Providers
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400 max-w-2xl leading-relaxed">
          Connect your favorite external services for LLMs, Voice providers, and Telephony globally. API keys are directly routed and injected into your connected Bolna execution environments securely.
        </p>
      </div>

      {/* Grid Zone */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {AVAILABLE_PROVIDERS.map((provider) => (
          <ProviderCard key={provider.id} provider={provider} />
        ))}
      </div>

      {/* Connected Keys Overview */}
      <div className="pt-8 border-t border-zinc-200 dark:border-zinc-800">
        <h2 className="text-xl font-bold mb-6 text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-zinc-400" />
          Active Configurations
        </h2>

        {connectedKeys.length === 0 ? (
          <div className="bg-zinc-50 dark:bg-zinc-900/40 rounded-3xl p-10 text-center border border-zinc-200 dark:border-zinc-800 border-dashed">
            <p className="text-sm font-medium text-zinc-500">No active keys synced. Start connecting a provider above.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {connectedKeys.map((p) => (
              <div 
                key={p.provider_id || p.provider_name} 
                className="flex items-center justify-between p-4 border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-950 shadow-sm transition hover:shadow-md"
              >
                <div>
                  <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100 mb-0.5">{p.provider_name}</p>
                  <p className="text-xs text-zinc-500 font-mono truncate max-w-[150px]">{p.provider_value}</p>
                </div>
                <form action={deleteProviderAction}>
                  <input type="hidden" name="provider_name" value={p.provider_name} />
                  <Button 
                    type="submit" 
                    variant="ghost" 
                    size="icon" 
                    className="h-9 w-9 text-red-500 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/30 rounded-lg group"
                  >
                    <Trash2 className="w-4 h-4 transition-transform group-hover:scale-110" />
                  </Button>
                </form>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
