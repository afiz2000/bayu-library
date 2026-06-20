interface PageShellProps {
  title: string;
  description?: string;
  loading: boolean;
  error: string | null;
  children: React.ReactNode;
}

export default function PageShell({ title, description, loading, error, children }: PageShellProps) {
  return (
    <main className="flex-1 px-10 py-10">
      <h1 className="text-2xl font-semibold text-navy">{title}</h1>
      {description && (
        <p className="mt-1 text-sm text-navy/60">{description}</p>
      )}

      {error && (
        <p className="mt-6 animate-slide-in rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          Failed to load data: {error}
        </p>
      )}

      {loading && !error && <TableSkeleton />}

      {!loading && !error && <div className="mt-6 animate-fade-in">{children}</div>}
    </main>
  );
}

function TableSkeleton() {
  return (
    <div className="mt-6 animate-pulse">
      <div className="mb-4 h-9 w-32 rounded-md bg-navy/10" />
      <div className="overflow-hidden rounded-lg border border-navy/10">
        <div className="h-11 bg-navy/15" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-t border-navy/10 px-4 py-3">
            <div className="h-3.5 w-16 rounded bg-navy/10" />
            <div className="h-3.5 w-32 rounded bg-navy/10" />
            <div className="h-3.5 w-24 rounded bg-navy/10" />
            <div className="ml-auto h-3.5 w-12 rounded bg-navy/10" />
          </div>
        ))}
      </div>
    </div>
  );
}
