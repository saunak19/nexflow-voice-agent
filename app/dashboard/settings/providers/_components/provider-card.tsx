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

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200">
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Connecting...
        </>
      ) : (
        "Connect Provider"
      )}
    </Button>
  );
}

export function ProviderCard({ provider }: { provider: ProviderDef }) {
  const [open, setOpen] = useState(false);

  return (
    <Card className="flex flex-col justify-between p-6 gap-6 rounded-3xl shadow-sm hover:shadow-md transition-shadow dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
      <div>
        <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-100">{provider.name}</h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2 leading-relaxed">{provider.description}</p>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="w-full rounded-xl mt-auto dark:border-zinc-700 dark:hover:bg-zinc-800 h-10">
            Connect
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Connect {provider.name}</DialogTitle>
            <DialogDescription>
              Enter your API keys for {provider.name}. They will be stored securely on Bolna.
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
                    placeholder={`Enter ${k.label}`}
                    className="h-10 rounded-xl"
                  />
                </div>
              ))}
            </div>
            <SubmitButton />
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
