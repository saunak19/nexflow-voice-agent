"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { UploadCloud, Loader2, Info } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { uploadBatchAction } from "@/app/dashboard/batches/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto h-11 px-8 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200">
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Uploading Batch...
        </>
      ) : (
        "Confirm"
      )}
    </Button>
  );
}

export function CreateBatchForm({ agents, phoneNumbers }: { agents: any[], phoneNumbers: { phone_number: string }[] }) {
  const [runType, setRunType] = useState("now");

  return (
    <form 
      action={async (formData) => {
        try {
          await uploadBatchAction(formData);
        } catch (err: any) {
          if (err.message === "NEXT_REDIRECT") {
            toast.success("Batch successfully queued!");
            throw err;
          }
          toast.error(err.message || "Failed to create batch.");
        }
      }} 
      className="space-y-8 animate-in fade-in duration-500"
    >
      <input type="hidden" name="runType" value={runType} />
      
      {/* Alert / Info Box */}
      <Alert className="bg-blue-50/50 text-blue-900 border-blue-200 dark:bg-blue-950/20 dark:text-blue-200 dark:border-blue-900/50 rounded-xl">
        <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
        <AlertDescription className="ml-2 font-medium">
          Ensure that your CSV file includes a column <code className="bg-blue-100 dark:bg-blue-900/40 px-1 py-0.5 rounded text-xs font-mono font-bold">contact_number</code> for phone numbers.
        </AlertDescription>
      </Alert>

      <div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 space-y-8">
        
        {/* Agent Select */}
        <div className="space-y-3">
          <Label htmlFor="agentId" className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Select Agent <span className="text-red-500">*</span>
          </Label>
          <Select name="agentId" required>
            <SelectTrigger className="h-11 rounded-xl">
              <SelectValue placeholder="Choose an agent to handle these calls" />
            </SelectTrigger>
            <SelectContent>
              {agents.map((agent) => (
                <SelectItem key={agent.id} value={agent.id}>
                  {agent.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* CSV Upload Zone */}
        <div className="space-y-3">
          <Label htmlFor="file" className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Upload CSV <span className="text-red-500">*</span>
          </Label>
          <div className="relative group">
            <Input 
              id="file" 
              name="file" 
              type="file" 
              accept=".csv" 
              required 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
            />
            <div className="border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl p-12 text-center transition-colors group-hover:bg-zinc-50 dark:group-hover:bg-zinc-900/20 flex flex-col items-center justify-center gap-3 relative z-0">
              <div className="h-12 w-12 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-500 dark:text-zinc-400 group-hover:bg-zinc-200 dark:group-hover:bg-zinc-800 transition-colors">
                <UploadCloud className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Drag and drop your CSV here, or click to browse.</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Only .csv files are supported. Max size 10MB.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Phone Number Select */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Calls will be made via Twilio using:
          </Label>
         <Select name="fromNumber" defaultValue="">
  <SelectTrigger className="h-11 rounded-xl">
    <SelectValue placeholder="Select a phone number" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="bolna_managed">NexFlow managed numbers</SelectItem>
    {phoneNumbers.map((n) => (
      <SelectItem key={n.phone_number} value={n.phone_number}>
        {n.phone_number}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
        </div>

        {/* Execution Tabs */}
        <div className="space-y-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
          <Label className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Execution Schedule</Label>
          <Tabs defaultValue="now" value={runType} onValueChange={setRunType} className="max-w-md">
            <TabsList className="grid w-full grid-cols-2 h-11 rounded-xl p-1">
              <TabsTrigger value="now" className="rounded-lg h-full">Run Now</TabsTrigger>
              <TabsTrigger value="schedule" className="rounded-lg h-full">Schedule</TabsTrigger>
            </TabsList>
            
            <TabsContent value="schedule" className="mt-4 animate-in slide-in-from-top-2 duration-200">
              <div className="space-y-2 relative">
                <Label htmlFor="scheduledAt" className="text-xs text-zinc-500">Scheduled Date & Time <span className="text-red-500">*</span></Label>
                <Input type="datetime-local" id="scheduledAt" name="scheduledAt" required={runType === "schedule"} className="h-11 rounded-xl" />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Other Fields */}
        <div className="space-y-6 pt-6 border-t border-zinc-100 dark:border-zinc-800">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
            <div>
              <Label htmlFor="retry" className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Auto-retry unconnected calls</Label>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Automatically re-dial numbers that didn't pick up after 15 minutes.</p>
            </div>
            <Switch id="retry" name="autoRetry" value="true" />
          </div>

          <div className="space-y-3">
             <Label htmlFor="webhookUrl" className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
               Webhook URL (Optional)
             </Label>
             <Input 
               id="webhookUrl" 
               name="webhookUrl" 
               type="url" 
               placeholder="https://example.com/webhook"
               className="h-11 rounded-xl"
             />
             <p className="text-xs text-zinc-500 dark:text-zinc-400">Receive real-time events when the batch starts, completes, or fails.</p>
          </div>
        </div>

        <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
          <SubmitButton />
        </div>
      </div>
    </form>
  );
}
