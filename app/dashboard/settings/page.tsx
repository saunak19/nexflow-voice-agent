export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
          Settings
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Workspace-level settings will live here. Authentication, branding, and provider sync controls can be added next.
        </p>
      </div>

      <div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          The settings page is now routed correctly so the sidebar no longer points to a missing page.
        </p>
      </div>
    </div>
  );
}
