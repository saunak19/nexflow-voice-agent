import { Sidebar } from "@/components/sidebar";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-y-auto bg-zinc-50 dark:bg-black/20">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-8 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            {/* Page title can be dynamic or set here */}
            NexFlow Command Center
          </h2>
          <div className="flex items-center gap-4">
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              {session.user?.email}
            </span>
            <div className="h-8 w-8 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-xs font-bold ring-2 ring-zinc-100 dark:ring-zinc-900">
              {session.user?.name?.[0] || session.user?.email?.[0]?.toUpperCase()}
            </div>
          </div>
        </header>
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
