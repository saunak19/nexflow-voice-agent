"use client";

import Link from "next/link";
import { User, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MagicCallButton } from "@/components/magic-call-button";
import { DeleteAgentButton } from "./delete-agent-button";
import { motion, Variants } from "framer-motion";

function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 24,
    },
  },
};

export function AgentsList({
  agents,
  phoneNumbers,
}: {
  agents: any[];
  phoneNumbers: { phone_number: string }[];
}) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
    >
      {agents.map((agent) => (
        <motion.div
          key={agent.id}
          variants={itemVariants}
          whileHover={{ y: -4 }}
          whileTap={{ scale: 0.98 }}
          className="group relative flex flex-col rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-[#1C1C1F]"
        >
          <div className="flex items-start justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-900 text-white dark:bg-zinc-800 transition-transform group-hover:scale-110">
              <User className="h-6 w-6" />
            </div>

            {/* ── Exact Status Chip from Reference Image ── */}
            <div className="flex items-center gap-1.5 rounded-full bg-zinc-100 dark:bg-[#2A2A2E] px-3 py-1.5 shadow-sm">
              <svg
                className="h-4 w-4 text-emerald-500 dark:text-[#00C853]"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
                />
              </svg>
              <span className="text-[13px] font-medium text-emerald-600 dark:text-[#00C853]">
                Ready
              </span>
            </div>
          </div>

          <div className="mt-4 flex-1 flex flex-col">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              {agent.name}
            </h3>
            <p className="mt-1 text-xs font-mono text-zinc-500 dark:text-zinc-400">
              ID: {agent.bolnaAgentId}
            </p>
            {agent.prompt && (
              <p className="mt-3 text-sm leading-relaxed text-zinc-600 line-clamp-3 dark:text-zinc-400">
                {agent.prompt}
              </p>
            )}
            <div className="mt-auto pt-4 flex items-center justify-between text-xs font-medium text-zinc-500 dark:text-zinc-500">
              <span>Created: {formatDate(agent.createdAt)}</span>
              <span>Updated: {formatDate(agent.updatedAt)}</span>
            </div>
          </div>

          <div className="mt-6 flex flex-col space-y-4">
            <MagicCallButton
              agentId={agent.id}
              tenantId={agent.tenantId}
              phoneNumbers={phoneNumbers}
            />

            <div className="flex w-full items-center gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <Button
                asChild
                variant="outline"
                className="flex-1 justify-center rounded-lg text-xs"
                size="sm"
              >
                <Link href={`/dashboard/agents/${agent.id}`}>
                  <ExternalLink className="mr-2 h-3.5 w-3.5" />
                  Configure
                </Link>
              </Button>
              <DeleteAgentButton localId={agent.id} bolnaId={agent.bolnaAgentId} />
            </div>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
