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
      <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">{title}</h1>
      {description && (
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{description}</p>
      )}

      {error && (
        <p className="mt-6 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          Failed to load data: {error}
        </p>
      )}

      {loading && !error && <p className="mt-6 text-sm text-zinc-500">Loading...</p>}

      {!loading && !error && <div className="mt-6">{children}</div>}
    </main>
  );
}
