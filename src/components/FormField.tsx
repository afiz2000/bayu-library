export const inputClass =
  "w-full rounded-md border border-black/[.08] bg-white px-3 py-2 text-sm text-zinc-900 dark:border-white/[.145] dark:bg-zinc-950 dark:text-zinc-100";

export const primaryButtonClass =
  "rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black";

export const secondaryButtonClass =
  "rounded-md border border-black/[.08] px-4 py-2 text-sm font-medium text-zinc-700 dark:border-white/[.145] dark:text-zinc-300";

export const dangerLinkClass =
  "text-xs font-medium text-red-600 hover:underline dark:text-red-400";

export const editLinkClass =
  "text-xs font-medium text-blue-600 hover:underline dark:text-blue-400";

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-zinc-700 dark:text-zinc-300">{label}</span>
      {children}
    </label>
  );
}
