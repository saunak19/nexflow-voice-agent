"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { DownloadCloud, Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { importPhoneNumberAction } from "@/app/dashboard/numbers/actions";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
    >
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Importing...
        </>
      ) : (
        "Import Phone Number"
      )}
    </Button>
  );
}

export function ImportNumberModal() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="rounded-xl border-zinc-200 dark:border-zinc-800 bg-white hover:bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:hover:bg-zinc-900 dark:text-zinc-50">
          <DownloadCloud className="mr-2 h-4 w-4" />
          Import Number
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Import Provider Number</DialogTitle>
          <DialogDescription>
            Register an external telephony provider number (like Twilio) into this workspace for inbound and outbound calling. You must connect the provider in Settings first.
          </DialogDescription>
        </DialogHeader>

        <form
          action={async (formData) => {
            try {
              await importPhoneNumberAction(formData);
              setOpen(false);
              toast.success("Phone number successfully imported");
            } catch (err: any) {
              toast.error(err.message || "Failed to import phone number");
            }
          }}
          className="space-y-6 pt-4"
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="provider" className="text-sm font-semibold">
                Provider
              </Label>
              <select
                id="provider"
                name="provider"
                defaultValue="twilio"
                className="flex h-10 w-full rounded-xl border border-zinc-200 bg-transparent px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:ring-offset-zinc-950 dark:focus-visible:ring-zinc-300"
              >
                <option value="twilio">Twilio</option>
                <option value="plivo">Plivo</option>
                <option value="vobiz">Vobiz</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phoneNumber" className="text-sm font-semibold">
                Phone Number (E.164)
              </Label>
              <Input
                id="phoneNumber"
                name="phoneNumber"
                placeholder="+14155552671"
                required
                className="h-10 rounded-xl"
              />
              <p className="text-xs text-zinc-500">Must include country code (e.g., +1).</p>
            </div>
          </div>

          <SubmitButton />
        </form>
      </DialogContent>
    </Dialog>
  );
}
