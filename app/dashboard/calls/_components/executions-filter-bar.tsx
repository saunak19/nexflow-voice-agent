"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { addDays, format } from "date-fns";
import { Calendar as CalendarIcon, FilterX } from "lucide-react";
import { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ExecutionsFilterBar({ agents }: { agents: { id: string; name: string }[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Parse current state from URL
  const currentAgent = searchParams.get("agentId") || "all";
  const currentBatch = searchParams.get("batchId") || "all";
  const startParam = searchParams.get("startDate");
  const endParam = searchParams.get("endDate");

  const [date, setDate] = React.useState<DateRange | undefined>({
    from: startParam ? new Date(startParam) : undefined,
    to: endParam ? new Date(endParam) : undefined,
  });

  const updateFilters = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value && value !== "all") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`?${params.toString()}`);
  };

  const handleDateSelect = (newDate: DateRange | undefined) => {
    setDate(newDate);
    const params = new URLSearchParams(searchParams);
    
    if (newDate?.from) {
      params.set("startDate", newDate.from.toISOString());
    } else {
      params.delete("startDate");
    }

    if (newDate?.to) {
      params.set("endDate", newDate.to.toISOString());
    } else {
      params.delete("endDate");
    }

    router.push(`?${params.toString()}`);
  };

  const clearFilters = () => {
    setDate(undefined);
    router.push("?");
  };

  const hasFilters = currentAgent !== "all" || currentBatch !== "all" || !!startParam || !!endParam;

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <Select value={currentAgent} onValueChange={(val) => updateFilters("agentId", val)}>
        <SelectTrigger className="w-[200px] h-10 rounded-xl bg-white dark:bg-zinc-950">
          <SelectValue placeholder="All Agents" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Agents</SelectItem>
          {agents.map((ag) => (
            <SelectItem key={ag.id} value={ag.id}>{ag.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={currentBatch} onValueChange={(val) => updateFilters("batchId", val)}>
        <SelectTrigger className="w-[200px] h-10 rounded-xl bg-white dark:bg-zinc-950">
          <SelectValue placeholder="All Batches" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Batches</SelectItem>
          {/* Static options for now until batch db is synced */}
          <SelectItem value="none" disabled>No active batches</SelectItem>
        </SelectContent>
      </Select>

      <div className="grid gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              id="date"
              variant={"outline"}
              className={cn(
                "w-[300px] justify-start text-left font-normal h-10 rounded-xl bg-white dark:bg-zinc-950",
                !date && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date?.from ? (
                date.to ? (
                  <>
                    {format(date.from, "LLL dd, y")} -{" "}
                    {format(date.to, "LLL dd, y")}
                  </>
                ) : (
                  format(date.from, "LLL dd, y")
                )
              ) : (
                <span>Pick a date range</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 rounded-xl" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={date?.from}
              selected={date}
              onSelect={handleDateSelect}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
      </div>

      {hasFilters && (
        <Button 
          variant="ghost" 
          onClick={clearFilters}
          className="h-10 px-3 text-zinc-500 hover:text-zinc-900 rounded-xl shrink-0"
        >
          <FilterX className="h-4 w-4 mr-2" />
          Clear
        </Button>
      )}
    </div>
  );
}
