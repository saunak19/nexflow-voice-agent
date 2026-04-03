"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Mic } from "lucide-react";
import type { VoiceProviderExecution } from "@/lib/voice-providers";

export function getStatusBadgeVariant(status: string) {
  const norm = status?.toLowerCase() || "";
  switch (norm) {
    case "completed":
      return "default";
    case "failed":
    case "error":
      return "destructive";
    case "in-progress":
    case "queued":
    case "ringing":
      return "secondary";
    case "stopped":
    case "canceled":
      return "outline";
    default:
      return "outline";
  }
}

function formatDuration(seconds?: number) {
  if (!seconds) return "0s";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatCurrency(cost?: number) {
  if (cost === undefined || cost === null) return "$0.000";
  return new Intl.NumberFormat("en-US", { 
    style: "currency", 
    currency: "USD",
    minimumFractionDigits: 3,
    maximumFractionDigits: 3
  }).format(cost);
}

// Exclude Bolna's flat platform fee so we display real usage cost only
function getUsageCost(execution: VoiceProviderExecution): number {
  const totalCost = Number(execution.total_cost ?? 0);
  const platformFee = Number(execution.cost_breakdown?.platform ?? 0);
  const usage = totalCost - platformFee;
  return usage > 0 ? usage : 0;
}

export function ExecutionsTable({ data }: { data: VoiceProviderExecution[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 p-12 text-center dark:border-zinc-800">
        <p className="text-zinc-500">No calls found.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950 overflow-hidden">
      <Table>
        <TableHeader className="bg-zinc-50 dark:bg-zinc-900/50 hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
          <TableRow className="hover:bg-transparent">
            <TableHead>Execution ID</TableHead>
            <TableHead>User Number</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Cost</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Timestamp</TableHead>
            <TableHead className="text-right">Conversation Data</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((execution) => {
            const recordingUrl = execution.telephony_data?.recording_url ?? execution.recording_url;
            return (
              <TableRow key={execution.id} className="group transition-colors hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20">
              <TableCell className="font-mono text-xs text-zinc-500">
                {execution.id.split("-").pop() || execution.id}
              </TableCell>
              <TableCell className="font-medium text-zinc-900 dark:text-zinc-100">
                {execution.telephony_data?.to_number || "N/A"}
              </TableCell>
              <TableCell className="text-zinc-500 capitalize">
                {execution.telephony_data?.call_type || "Outbound"}
              </TableCell>
              <TableCell className="text-zinc-500 tabular-nums">
                {formatDuration(execution.telephony_data?.duration || execution.conversation_time)}
              </TableCell>
              <TableCell className="text-zinc-500 tabular-nums font-mono text-xs">
                ${getUsageCost(execution).toFixed(3)}
              </TableCell>
              <TableCell>
                <Badge variant={getStatusBadgeVariant(execution.status)} className="capitalize rounded-lg shadow-none">
                  {execution.status}
                </Badge>
              </TableCell>
              <TableCell className="text-zinc-500 text-sm">
                {new Date(execution.created_at).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </TableCell>
              <TableCell className="text-right">
                {recordingUrl ? (
                  <Button variant="secondary" size="sm" asChild className="h-8 shadow-none bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700">
                    <a href={recordingUrl} target="_blank" rel="noopener noreferrer">
                      <Mic className="mr-2 h-3.5 w-3.5" />
                      Recording
                    </a>
                  </Button>
                ) : (
                  <span className="text-xs text-zinc-400 italic">No media</span>
                )}
              </TableCell>
            </TableRow>
          );
        })}
        </TableBody>
      </Table>
    </div>
  );
}

// "use client";

// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from "@/components/ui/table";
// import { Badge } from "@/components/ui/badge";
// import { Button } from "@/components/ui/button";
// import { BolnaExecution } from "@/lib/bolna-client";
// import { ExternalLink, Mic } from "lucide-react";

// export function getStatusBadgeVariant(status: string) {
//   const norm = status?.toLowerCase() || "";
//   switch (norm) {
//     case "completed":
//       return "default";
//     case "failed":
//     case "error":
//       return "destructive";
//     case "in-progress":
//     case "queued":
//     case "ringing":
//       return "secondary";
//     case "stopped":
//     case "canceled":
//       return "outline";
//     default:
//       return "outline";
//   }
// }

// function formatDuration(seconds?: number) {
//   if (!seconds) return "0s";
//   const m = Math.floor(seconds / 60);
//   const s = Math.floor(seconds % 60);
//   return m > 0 ? `${m}m ${s}s` : `${s}s`;
// }

// // ─── Custom INR Cost Calculation ─────────────────────────────────────────────
// // Calculates the cost in Indian Rupees based on the ~₹3.71 per minute 
// // infrastructure cost (Bolna + Plivo + Sarvam + OpenAI)
// function calculateINRCost(execution: BolnaExecution): string {
//   const seconds = execution.telephony_data?.duration || execution.conversation_time || 0;
  
//   if (seconds === 0) return "₹0.00";

//   // Convert seconds to exact fractional minutes
//   const minutes = seconds / 60;

//   // Your stack's cost per minute breakdown
//   const bolnaPlatform = 2.00;
//   const plivoTelephony = 0.40;
//   const sarvamStt = 0.50;
//   const sarvamTts = 1.18;
//   const openAiLlm = 0.06;

//   const costPerMinute = bolnaPlatform + plivoTelephony + sarvamStt + sarvamTts + openAiLlm; // ~₹3.71
//   const totalCost = minutes * costPerMinute;

//   return new Intl.NumberFormat("en-IN", { 
//     style: "currency", 
//     currency: "INR",
//     minimumFractionDigits: 2,
//     maximumFractionDigits: 2
//   }).format(totalCost);
// }
// // ─────────────────────────────────────────────────────────────────────────────

// export function ExecutionsTable({ data }: { data: BolnaExecution[] }) {
//   if (!data || data.length === 0) {
//     return (
//       <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 p-12 text-center dark:border-zinc-800">
//         <p className="text-zinc-500">No calls found.</p>
//       </div>
//     );
//   }

//   return (
//     <div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950 overflow-hidden">
//       <Table>
//         <TableHeader className="bg-zinc-50 dark:bg-zinc-900/50 hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
//           <TableRow className="hover:bg-transparent">
//             <TableHead>Execution ID</TableHead>
//             <TableHead>User Number</TableHead>
//             <TableHead>Type</TableHead>
//             <TableHead>Duration</TableHead>
//             <TableHead>Cost (INR)</TableHead>
//             <TableHead>Status</TableHead>
//             <TableHead>Timestamp</TableHead>
//             <TableHead className="text-right">Conversation Data</TableHead>
//           </TableRow>
//         </TableHeader>
//         <TableBody>
//           {data.map((execution) => {
//             const recordingUrl = execution.telephony_data?.recording_url ?? execution.recording_url;
//             return (
//               <TableRow key={execution.id} className="group transition-colors hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20">
//               <TableCell className="font-mono text-xs text-zinc-500">
//                 {execution.id.split("-").pop() || execution.id}
//               </TableCell>
//               <TableCell className="font-medium text-zinc-900 dark:text-zinc-100">
//                 {execution.telephony_data?.to_number || "N/A"}
//               </TableCell>
//               <TableCell className="text-zinc-500 capitalize">
//                 {execution.telephony_data?.call_type || "Outbound"}
//               </TableCell>
//               <TableCell className="text-zinc-500 tabular-nums">
//                 {formatDuration(execution.telephony_data?.duration || execution.conversation_time)}
//               </TableCell>
//               <TableCell className="text-zinc-500 tabular-nums font-mono text-xs font-semibold">
//                 {calculateINRCost(execution)}
//               </TableCell>
//               <TableCell>
//                 <Badge variant={getStatusBadgeVariant(execution.status)} className="capitalize rounded-lg shadow-none">
//                   {execution.status}
//                 </Badge>
//               </TableCell>
//               <TableCell className="text-zinc-500 text-sm tabular-nums">
//                 {new Date(execution.created_at).toLocaleString("en-IN", {
//                   timeZone: "Asia/Kolkata",
//                   month: "short",
//                   day: "numeric",
//                   hour: "numeric",
//                   minute: "2-digit",
//                 })}
//               </TableCell>
//               <TableCell className="text-right">
//                 {recordingUrl ? (
//                   <Button variant="secondary" size="sm" asChild className="h-8 shadow-none bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700">
//                     <a href={recordingUrl} target="_blank" rel="noopener noreferrer">
//                       <Mic className="mr-2 h-3.5 w-3.5" />
//                       Recording
//                     </a>
//                   </Button>
//                 ) : (
//                   <span className="text-xs text-zinc-400 italic">No media</span>
//                 )}
//               </TableCell>
//             </TableRow>
//           );
//         })}
//         </TableBody>
//       </Table>
//     </div>
//   );
// }
