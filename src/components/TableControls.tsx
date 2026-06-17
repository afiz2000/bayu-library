import { inputClass } from "@/components/FormField";

interface TableControlsProps {
  query: string;
  onQueryChange: (value: string) => void;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalCount: number;
  placeholder?: string;
}

export default function TableControls({
  query,
  onQueryChange,
  page,
  totalPages,
  onPageChange,
  totalCount,
  placeholder,
}: TableControlsProps) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <input
        className={`${inputClass} max-w-xs`}
        placeholder={placeholder ?? "Search..."}
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
      />
      <div className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400">
        <span>
          {totalCount} result{totalCount === 1 ? "" : "s"}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="rounded-md border border-black/[.08] px-2 py-1 disabled:opacity-40 dark:border-white/[.145]"
          >
            Prev
          </button>
          <span>
            Page {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="rounded-md border border-black/[.08] px-2 py-1 disabled:opacity-40 dark:border-white/[.145]"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
