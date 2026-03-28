import Link from "next/link";
import { ArrowLeft, BookOpen, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createKnowledgeBaseAction } from "@/app/dashboard/knowledge-base/actions";

export default async function NewKnowledgeBasePage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const params = await searchParams;
  const defaultType = params.type === "pdf" ? "pdf" : "url";

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <div>
        <Link
          href="/dashboard/knowledge-base"
          className="mb-4 inline-flex items-center gap-2 text-sm text-zinc-500 transition hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to knowledge base
        </Link>
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
          Add Knowledge Source
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Save URLs or imported PDF references so your team can manage agent knowledge centrally.
        </p>
      </div>

      <form
        action={createKnowledgeBaseAction}
        className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
      >
        <div className="mb-8 flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950">
            <BookOpen className="h-7 w-7" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
              Knowledge source details
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              You can save the Bolna knowledge-base ID now or add it later after syncing.
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <label htmlFor="name" className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              Display name
            </label>
            <Input id="name" name="name" placeholder="Pricing FAQ" required className="h-11 rounded-xl" />
          </div>

          <div className="space-y-2">
            <label htmlFor="type" className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              Source type
            </label>
            <select
              id="type"
              name="type"
              defaultValue={defaultType}
              className="h-11 w-full rounded-xl border border-zinc-200 bg-transparent px-4 text-sm outline-none transition focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900/40 dark:focus:border-zinc-600"
            >
              <option value="url">URL</option>
              <option value="pdf">PDF</option>
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="bolnaKbId" className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              Bolna knowledge ID
            </label>
            <Input id="bolnaKbId" name="bolnaKbId" placeholder="Optional" className="h-11 rounded-xl font-mono" />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label htmlFor="sourceUrl" className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              Source URL
            </label>
            <Input
              id="sourceUrl"
              name="sourceUrl"
              placeholder="https://example.com/faq or public PDF URL"
              className="h-11 rounded-xl"
            />
          </div>
        </div>

        <div className="mt-8 flex items-center justify-between gap-4 border-t border-zinc-200 pt-6 dark:border-zinc-800">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            File uploads can be added next. This page already gives you a working add flow for URL-based or imported resources.
          </p>
          <Button type="submit" className="h-11 rounded-xl bg-zinc-900 px-5 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200">
            <Save className="mr-2 h-4 w-4" />
            Save knowledge
          </Button>
        </div>
      </form>
    </div>
  );
}
