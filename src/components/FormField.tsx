export const inputClass =
  "w-full rounded-md border border-navy/15 bg-white px-3 py-2 text-sm text-navy-dark outline-none transition-shadow focus:border-gold focus:ring-2 focus:ring-gold/40 disabled:bg-navy/5 disabled:text-navy/60";

export const primaryButtonClass =
  "rounded-md bg-navy px-4 py-2 text-sm font-medium text-white shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:bg-navy-light hover:shadow-md active:translate-y-0 disabled:translate-y-0 disabled:opacity-50 disabled:shadow-none";

export const secondaryButtonClass =
  "rounded-md border border-navy/20 px-4 py-2 text-sm font-medium text-navy transition-all duration-150 hover:-translate-y-0.5 hover:bg-navy/5 active:translate-y-0";

export const dangerLinkClass =
  "text-xs font-medium text-red-600 transition-colors hover:text-red-700 hover:underline";

export const editLinkClass =
  "text-xs font-medium text-gold-dark transition-colors hover:text-navy hover:underline";

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-navy">{label}</span>
      {children}
    </label>
  );
}
