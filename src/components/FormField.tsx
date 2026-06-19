export const inputClass =
  "w-full rounded-md border border-navy/15 bg-white px-3 py-2 text-sm text-navy-dark outline-none focus:border-gold focus:ring-1 focus:ring-gold disabled:bg-navy/5 disabled:text-navy/60";

export const primaryButtonClass =
  "rounded-md bg-navy px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-navy-light disabled:opacity-50";

export const secondaryButtonClass =
  "rounded-md border border-navy/20 px-4 py-2 text-sm font-medium text-navy transition-colors hover:bg-navy/5";

export const dangerLinkClass =
  "text-xs font-medium text-red-600 hover:underline";

export const editLinkClass =
  "text-xs font-medium text-gold-dark hover:underline";

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-navy">{label}</span>
      {children}
    </label>
  );
}
