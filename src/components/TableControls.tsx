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
      <div className="flex items-center gap-3 text-sm text-navy/60">
        <span>
          {totalCount} result{totalCount === 1 ? "" : "s"}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="rounded-md border border-navy/15 px-2 py-1 text-navy transition-colors hover:bg-navy/5 disabled:opacity-40 disabled:hover:bg-transparent"
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
            className="rounded-md border border-navy/15 px-2 py-1 text-navy transition-colors hover:bg-navy/5 disabled:opacity-40 disabled:hover:bg-transparent"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
