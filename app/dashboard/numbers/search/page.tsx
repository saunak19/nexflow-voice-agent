import Link from "next/link";
import { ArrowLeft, Globe, Search, ShoppingCart } from "lucide-react";

import { bolnaClient } from "@/lib/bolna-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buyPhoneNumberAction } from "@/app/dashboard/numbers/actions";

export default async function SearchNumbersPage({
  searchParams,
}: {
  searchParams: Promise<{ country?: string; pattern?: string }>;
}) {
  const params = await searchParams;
  const country = params.country || "US";
  const pattern = params.pattern || "";

  let results: Array<{
    phone_number: string;
    price?: number;
    locality?: string | null;
    region?: string | null;
  }> = [];
  let errorMessage = "";

  if (country) {
    try {
      results = await bolnaClient.searchPhoneNumbers({
        country,
        pattern,
      });
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : "Unable to search phone numbers right now.";
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
      <div>
        <Link
          href="/dashboard/numbers"
          className="mb-4 inline-flex items-center gap-2 text-sm text-zinc-500 transition hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to numbers
        </Link>
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
          Search Available Numbers
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Search live Bolna inventory by country and optional pattern, then purchase a number from the results.
        </p>
      </div>

      <div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <form className="grid gap-4 md:grid-cols-[140px_1fr_auto]">
          <div className="space-y-2">
            <label htmlFor="country" className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              Country
            </label>
            <select
              id="country"
              name="country"
              defaultValue={country}
              className="h-11 w-full rounded-xl border border-zinc-200 bg-transparent px-4 text-sm outline-none transition focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900/40 dark:focus:border-zinc-600"
            >
              <option value="US">US</option>
              <option value="IN">IN</option>
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="pattern" className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              Pattern / area code
            </label>
            <Input id="pattern" name="pattern" defaultValue={pattern} placeholder="415" className="h-11 rounded-xl" />
          </div>

          <div className="flex items-end">
            <Button type="submit" className="h-11 rounded-xl bg-zinc-900 px-5 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200">
              <Search className="mr-2 h-4 w-4" />
              Search
            </Button>
          </div>
        </form>
      </div>

      {errorMessage ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {errorMessage}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {results.length === 0 ? (
          <div className="col-span-full rounded-3xl border-2 border-dashed border-zinc-200 p-16 text-center dark:border-zinc-800">
            <Globe className="mx-auto h-10 w-10 text-zinc-300" />
            <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
              Search results will appear here.
            </p>
          </div>
        ) : (
          results.map((number) => (
            <div
              key={number.phone_number}
              className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                    {number.phone_number}
                  </p>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    {[number.locality, number.region].filter(Boolean).join(", ") || "Available number"}
                  </p>
                </div>
                <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                  ${number.price ?? 0}
                </span>
              </div>

              <form action={buyPhoneNumberAction} className="mt-6">
                <input type="hidden" name="phoneNumber" value={number.phone_number} />
                <input type="hidden" name="country" value={country} />
                <Button type="submit" className="h-10 w-full rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200">
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Buy this number
                </Button>
              </form>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
