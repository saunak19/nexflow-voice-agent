"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { connectProviderConfigsAction } from "@/app/dashboard/settings/providers/actions";

export interface ProviderKeyDef {
  name: string;
  label: string;
  type?: string;
}

export interface ProviderDef {
  id: string;
  name: string;
  description: string;
  keys: ProviderKeyDef[];
}

function SubmitButton({ connected }: { connected: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200">
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Saving...
        </>
      ) : (
        connected ? "Update Configuration" : "Connect Provider"
      )}
    </Button>
  );
}

export function ProviderCard({
  provider,
  configuredKeys = [],
}: {
  provider: ProviderDef;
  configuredKeys?: string[];
}) {
  const [open, setOpen] = useState(false);
  const configuredCount = provider.keys.filter((key) => configuredKeys.includes(key.name)).length;
  const isConnected = configuredCount === provider.keys.length;
  const isPartial = configuredCount > 0 && !isConnected;

  return (
    <Card className="flex flex-col justify-between p-6 gap-6 rounded-3xl shadow-sm hover:shadow-md transition-shadow dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
      <div>
        <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-100">{provider.name}</h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2 leading-relaxed">{provider.description}</p>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            variant={isConnected ? "default" : isPartial ? "default" : "outline"}
            className={`w-full rounded-xl mt-auto h-10 ${
              isConnected
                ? "bg-green-600 text-white hover:bg-green-700 dark:bg-green-600 dark:text-white dark:hover:bg-green-700"
                : isPartial
                  ? "bg-amber-500 text-white hover:bg-amber-600 dark:bg-amber-500 dark:text-white dark:hover:bg-amber-600"
                  : "dark:border-zinc-700 dark:hover:bg-zinc-800"
            }`}
          >
            {isConnected ? "Connected" : isPartial ? "Finish Setup" : "Connect"}
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{isConnected ? `Manage ${provider.name}` : `Connect ${provider.name}`}</DialogTitle>
            <DialogDescription>
              {isConnected
                ? `This workspace has already been configured for ${provider.name}. Update any value below if you need to change it.`
                : `Enter your API keys for ${provider.name}. They will be stored for this workspace and synced to the active provider backend.`}
            </DialogDescription>
          </DialogHeader>
          <form
            action={async (formData) => {
              await connectProviderConfigsAction(formData);
              setOpen(false);
            }}
            className="space-y-6 pt-4"
          >
            <div className="space-y-4">
              {provider.keys.map((k) => (
                <div key={k.name} className="space-y-2">
                  <Label htmlFor={k.name} className="text-sm font-semibold">{k.label}</Label>
                  <Input
                    id={k.name}
                    name={k.name}
                    type={k.type || "text"}
                    required
                    placeholder={configuredKeys.includes(k.name) ? `Saved for this workspace - enter new ${k.label} to update` : `Enter ${k.label}`}
                    className="h-10 rounded-xl"
                  />
                </div>
              ))}
            </div>
            <SubmitButton connected={isConnected} />
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
