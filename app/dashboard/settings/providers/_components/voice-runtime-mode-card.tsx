"use client";

import { useState, useTransition } from "react";
import { ArrowRightLeft, PhoneCall, RefreshCcw, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  getVoiceProviderModeLabel,
  type TenantVoiceProviderMode,
  type TenantVoiceProviderRuntimeView,
} from "@/lib/voice-provider-mode";
import {
  setTenantVoiceProviderModeAction,
  validateTenantVoiceProviderReadinessAction,
} from "@/app/dashboard/settings/providers/actions";

type VoiceRuntimeModeCardProps = {
  runtime: TenantVoiceProviderRuntimeView;
};

function getSummary(runtime: TenantVoiceProviderRuntimeView) {
  if (runtime.configuredMode === "twilio-direct") {
    return "Twilio now manages number inventory for this workspace. NexFlow Managed calling stays active while direct calling is prepared.";
  }

  if (runtime.configuredMode === "plivo-direct") {
    return "Plivo now manages number inventory for this workspace. NexFlow Managed calling stays active while direct calling is prepared.";
  }

  return "NexFlow Managed mode keeps number management and calling on the current stable workspace path.";
}

export function VoiceRuntimeModeCard({ runtime }: VoiceRuntimeModeCardProps) {
  const router = useRouter();
  const [providerMode, setProviderMode] = useState<TenantVoiceProviderMode>(runtime.configuredMode);
  const [readinessMessage, setReadinessMessage] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();
  const [isChecking, startChecking] = useTransition();
  const numberManagementMode =
    runtime.configuredMode === "twilio-direct"
      ? "Direct Twilio"
      : runtime.configuredMode === "plivo-direct"
        ? "Direct Plivo"
        : "NexFlow Managed";
  const aiCallingMode = "NexFlow Managed";

  const readinessTone = readinessMessage
    ? readinessMessage.toLowerCase().includes("ready")
      ? "text-green-700 dark:text-green-300"
      : "text-amber-700 dark:text-amber-300"
    : "text-zinc-600 dark:text-zinc-300";
  const readinessBoxTone = readinessMessage
    ? readinessMessage.toLowerCase().includes("ready")
      ? "border-green-200 bg-green-50/70 dark:border-green-900/50 dark:bg-green-950/20"
      : "border-amber-200 bg-amber-50/70 dark:border-amber-900/50 dark:bg-amber-950/20"
    : "border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/60";
  const summary = getSummary(runtime);

  return (
    <Card className="rounded-3xl border-zinc-200 p-7 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="grid gap-8 xl:grid-cols-[1.2fr_420px]">
        <div className="space-y-5">
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Voice Runtime Mode</h2>
            <p className="max-w-2xl text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
              Choose how this workspace should evolve. Number management can move to a direct
              provider without disrupting the current calling flow.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/70">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                Target
              </p>
              <p className="mt-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {getVoiceProviderModeLabel(runtime.configuredMode)}
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/70">
              <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
                <ArrowRightLeft className="h-4 w-4" />
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em]">Numbers</p>
              </div>
              <p className="mt-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {numberManagementMode}
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/70">
              <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
                <PhoneCall className="h-4 w-4" />
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em]">Calls</p>
              </div>
              <p className="mt-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {aiCallingMode}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white/90 p-4 dark:border-zinc-800 dark:bg-zinc-950/80">
            <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">{summary}</p>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-zinc-200 bg-white/90 p-5 dark:border-zinc-800 dark:bg-zinc-950/80">
            <label
              htmlFor="providerMode"
              className="text-sm font-semibold text-zinc-900 dark:text-zinc-100"
            >
              Workspace voice mode
            </label>
            <div className="mt-3 flex flex-col gap-3">
            <select
              id="providerMode"
              name="providerMode"
              value={providerMode}
              onChange={(event) => setProviderMode(event.target.value as TenantVoiceProviderMode)}
              className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
            >
              <option value="bolna">NexFlow Managed (stable default)</option>
              <option value="twilio-direct">Direct Twilio (number management live)</option>
              <option value="plivo-direct">Direct Plivo (number management live)</option>
            </select>
              <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                type="button"
                className="rounded-xl"
                disabled={isSaving}
                onClick={() => {
                  startSaving(async () => {
                    try {
                      const formData = new FormData();
                      formData.set("providerMode", providerMode);
                      await setTenantVoiceProviderModeAction(formData);
                      toast.success("Workspace voice mode updated");
                      router.refresh();
                    } catch (error) {
                      toast.error(
                        error instanceof Error
                          ? error.message
                          : "Failed to save the workspace voice mode"
                      );
                    }
                  });
                }}
              >
                {isSaving ? "Saving..." : "Save Mode"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                disabled={isChecking}
                onClick={() => {
                  startChecking(async () => {
                    try {
                      const result = await validateTenantVoiceProviderReadinessAction();
                      setReadinessMessage(result.message);
                      if (result.ok) {
                        toast.success(result.message);
                      } else {
                        toast.error(result.message);
                      }
                      router.refresh();
                    } catch (error) {
                      const message =
                        error instanceof Error
                          ? error.message
                          : "Failed to validate the provider readiness";
                      setReadinessMessage(message);
                      toast.error(message);
                    }
                  });
                }}
              >
                {isChecking ? (
                  "Checking..."
                ) : (
                  <>
                    <RefreshCcw className="mr-2 h-4 w-4" />
                    Check Readiness
                  </>
                )}
              </Button>
            </div>
            </div>
          </div>

          <div className={`rounded-2xl border px-4 py-4 ${readinessBoxTone}`}>
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500 dark:text-zinc-400" />
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                  Readiness
                </p>
                <p className={`text-sm leading-relaxed ${readinessTone}`}>
                  {readinessMessage ??
                    "Run a readiness check after saving mode changes to verify the selected provider credentials for this workspace."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
