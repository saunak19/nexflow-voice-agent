"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Users, 
  Phone, 
  Hash, 
  Network, 
  BookOpen, 
  Layers,
  Settings,
  LogOut
} from "lucide-react";
import { signOut } from "next-auth/react";

const navigation = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { name: "Agents", href: "/dashboard/agents", icon: Users },
  { name: "Call History", href: "/dashboard/calls", icon: Phone },
  { name: "Phone Numbers", href: "/dashboard/numbers", icon: Hash },
  { name: "SIP Trunks", href: "/dashboard/sip-trunks", icon: Network },
  { name: "Knowledge Base", href: "/dashboard/knowledge-base", icon: BookOpen },
  { name: "Batches", href: "/dashboard/batches", icon: Layers },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-64 flex-col bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 shadow-sm transition-all duration-300">
      <div className="flex h-16 shrink-0 items-center px-6">
        <Link href="/dashboard" className="flex items-center gap-2 group">
          <Image
            src="/NexFlow-logo (2).png"
            alt="NexFlow Logo"
            width={180}
            height={42}
            className="h-8 w-auto object-contain"
            priority
          />
          
        </Link>
      </div>
      
      <nav className="flex-1 space-y-1 px-4 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-50 shadow-sm"
                  : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900/50 dark:hover:text-zinc-50"
              )}
            >
              <item.icon
                className={cn(
                  "mr-3 h-5 w-5 shrink-0 transition-transform group-hover:scale-110",
                  isActive ? "text-zinc-900 dark:text-zinc-50" : "text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300"
                )}
                aria-hidden="true"
              />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-zinc-200 dark:border-zinc-800 p-4 space-y-1">
        <Link
          href="/dashboard/settings"
          className="group flex items-center rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900/50 dark:hover:text-zinc-50 transition-all"
        >
          <Settings className="mr-3 h-5 w-5 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300" />
          Settings
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full group flex items-center rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/20 transition-all"
        >
          <LogOut className="mr-3 h-5 w-5 text-red-400 group-hover:text-red-600 dark:group-hover:text-red-300" />
          Logout
        </button>
      </div>
    </div>
  );
}
