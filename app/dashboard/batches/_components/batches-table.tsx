"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Play,
  Square,
  Download,
  Trash2,
  ExternalLink,
  Copy,
  Layers,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";
import { BatchResponse } from "@/lib/bolna-client";

import {
  deleteBatchAction,
  runBatchNowAction,
  stopBatchAction,
} from "../actions";

interface BatchesTableProps {
  batches: BatchResponse[];
  agents: { id: string; name: string; bolnaAgentId: string }[];
}

export function BatchesTable({ batches, agents }: BatchesTableProps) {
  const [loadingAction, setLoadingAction] = useState<Record<string, boolean>>({});
  const [deletedBatchIds, setDeletedBatchIds] = useState<Set<string>>(new Set());

  const handleAction = async (batchId: string, actionType: "delete" | "run" | "stop") => {
    setLoadingAction((prev) => ({ ...prev, [`${actionType}-${batchId}`]: true }));
    try {
      let res;
      if (actionType === "delete") {
        if (!confirm("Are you sure you want to delete this batch?")) {
          setLoadingAction((prev) => ({ ...prev, [`${actionType}-${batchId}`]: false }));
          return;
        }
        res = await deleteBatchAction(batchId);
      } else if (actionType === "run") {
        res = await runBatchNowAction(batchId);
      } else if (actionType === "stop") {
        res = await stopBatchAction(batchId);
      }

      if (res && "success" in res && res.success) {
        toast.success(`Batch ${actionType} action successful`);
        if (actionType === "delete") {
          setDeletedBatchIds((prev) => new Set(prev).add(batchId));
        }
      } else if (res && "error" in res) {
        toast.error(res.error as string || `Failed to ${actionType} batch`);
      }
    } catch (error) {
      toast.error(`Error performing ${actionType} on batch`);
    } finally {
      setLoadingAction((prev) => ({ ...prev, [`${actionType}-${batchId}`]: false }));
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300";
      case "in-progress":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300";
      case "stopped":
        return "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300";
      case "queued":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300";
      default:
        return "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300";
    }
  };

  const visibleBatches = batches.filter((b) => !deletedBatchIds.has(b.batch_id));

  if (visibleBatches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-zinc-200 p-20 text-center dark:border-zinc-800">
        <div className="h-20 w-20 rounded-2xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center mb-6">
          <Layers className="h-10 w-10 text-zinc-400" />
        </div>
        <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
          No batches scheduled
        </h3>
        <p className="mt-2 text-zinc-500 dark:text-zinc-400 max-w-sm">
          Initiate high-volume voice call campaigns by uploading a CSV of contacts.
        </p>
        <div className="mt-8 flex gap-4">
          <Button asChild className="rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950">
            <Link href="/dashboard/batches/new">Create First Batch</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-zinc-50/50 dark:bg-zinc-900/20">
            <TableHead className="font-semibold">Batch ID</TableHead>
            <TableHead className="font-semibold">File Name</TableHead>
            <TableHead className="font-semibold text-center">Contacts</TableHead>
            <TableHead className="font-semibold">Execution</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
            <TableHead className="font-semibold">Workflow</TableHead>
            <TableHead className="font-semibold">Created At</TableHead>
            <TableHead className="text-right font-semibold">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visibleBatches.map((batch) => {
            const shortId = batch.batch_id.slice(0, 8);
            const fileName = batch.file_name || batch.name || "contacts.csv";
            const isStopDisabled = batch.status !== "in-progress" && batch.status !== "queued" && batch.status !== "scheduled";

            return (
              <TableRow key={batch.batch_id} className="group">
                <TableCell className="font-mono text-sm max-w-[120px]">
                  <div className="flex items-center justify-between">
                    <span className="truncate">{shortId}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity hover:text-zinc-900 dark:hover:text-zinc-50"
                      onClick={() => copyToClipboard(batch.batch_id)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
                <TableCell className="max-w-[150px] truncate font-medium" title={fileName}>
                  {fileName}
                </TableCell>
                <TableCell className="text-center">
                  <span className="font-mono bg-zinc-100 dark:bg-zinc-900 px-2 py-1 rounded text-xs">
                    {batch.valid_contacts || 0} / {batch.total_calls || 0}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1 text-xs font-medium">
                    {batch.execution_status && Object.keys(batch.execution_status).length > 0 ? (
                      Object.entries(batch.execution_status).map(([status, count]) => (
                        <span key={status} className="text-zinc-700 dark:text-zinc-300">
                          {status}: {count}
                        </span>
                      ))
                    ) : (
                      <span className="text-zinc-400">-</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={`uppercase text-[10px] tracking-wider font-bold border-transparent ${getStatusBadgeVariant(batch.status)}`}>
                    {batch.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  {batch.workflow || "calls-only"}
                </TableCell>
                <TableCell className="text-sm text-zinc-500 dark:text-zinc-400 whitespace-nowrap" suppressHydrationWarning>
                  {batch.created_at ? new Date(batch.created_at).toLocaleString('en-IN', {
                    timeZone: 'Asia/Kolkata',
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  }) : "-"}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
                      onClick={() => handleAction(batch.batch_id, "run")}
                      disabled={loadingAction[`run-${batch.batch_id}`]}
                      title="Run Now"
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
                      onClick={() => handleAction(batch.batch_id, "stop")}
                      disabled={isStopDisabled || loadingAction[`stop-${batch.batch_id}`]}
                      title="Stop Batch"
                    >
                      <Square className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
                      onClick={() => window.open(`https://api.bolna.ai/batches/${batch.batch_id}/executions/download`, "_blank")}
                      title="Download Details"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/50"
                      onClick={() => handleAction(batch.batch_id, "delete")}
                      disabled={loadingAction[`delete-${batch.batch_id}`]}
                      title="Delete Batch"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      asChild
                      className="h-8 w-8 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
                      title="View Call Log"
                    >
                      <Link href={`/dashboard/calls?batchId=${batch.batch_id}`}>
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
