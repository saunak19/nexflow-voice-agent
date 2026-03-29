"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Plus, Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createKnowledgeBaseAction } from "@/app/dashboard/knowledge-base/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200">
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Adding Knowledge Base...
        </>
      ) : (
        "Add Knowledge Base"
      )}
    </Button>
  );
}

export function CreateKnowledgeDialog() {
  const [activeTab, setActiveTab] = useState("pdf");
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950">
          <Plus className="mr-2 h-4 w-4" />
          Add Knowledge Base
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Knowledge Base</DialogTitle>
        </DialogHeader>
        
        <form action={async (formData) => {
          await createKnowledgeBaseAction(formData);
          setOpen(false);
        }} className="space-y-6 pt-4">
          <input type="hidden" name="type" value={activeTab} />
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Knowledge Base Name</Label>
              <Input id="name" name="name" placeholder="e.g. Acme Corp Policies" required className="h-10 rounded-xl" />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="language">Language Support</Label>
              <Select name="language" defaultValue="english">
                <SelectTrigger className="h-10 rounded-xl">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="english">English (Default)</SelectItem>
                  <SelectItem value="multilingual">Multilingual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Tabs defaultValue="pdf" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4 h-10 rounded-lg">
              <TabsTrigger value="pdf" className="rounded-md">Upload PDF</TabsTrigger>
              <TabsTrigger value="url" className="rounded-md">Add URL</TabsTrigger>
            </TabsList>
            
            <TabsContent value="pdf" className="space-y-4 mt-0">
              <div className="space-y-2">
                <Input 
                  id="file" 
                  name="file" 
                  type="file" 
                  accept=".pdf" 
                  required={activeTab === "pdf"}
                  className="file:hidden border-2 border-dashed rounded-xl border-zinc-200 dark:border-zinc-800 p-8 text-center text-sm h-32 flex cursor-pointer items-center justify-center hover:bg-zinc-50 dark:hover:bg-zinc-900/50" 
                />
              </div>
            </TabsContent>
            
            <TabsContent value="url" className="space-y-4 mt-0">
              <div className="space-y-2">
                <Label htmlFor="sourceUrl">Website URL</Label>
                <Input 
                  id="sourceUrl" 
                  name="sourceUrl" 
                  type="url" 
                  placeholder="https://example.com"
                  required={activeTab === "url"}
                  className="h-10 rounded-xl"
                />
              </div>
            </TabsContent>
          </Tabs>

          <SubmitButton />
        </form>
      </DialogContent>
    </Dialog>
  );
}
