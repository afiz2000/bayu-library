export interface Column<T> {
  header: string;
  accessor: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  getKey: (row: T) => string;
  emptyMessage?: string;
}

export default function DataTable<T>({ columns, rows, getKey, emptyMessage }: DataTableProps<T>) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-zinc-500">{emptyMessage ?? "No records found."}</p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-black/[.08] dark:border-white/[.145]">
      <table className="min-w-full divide-y divide-black/[.08] text-sm dark:divide-white/[.145]">
        <thead className="bg-zinc-50 dark:bg-zinc-900">
          <tr>
            {columns.map((col) => (
              <th
                key={col.header}
                className="px-4 py-3 text-left font-medium text-zinc-600 dark:text-zinc-400"
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-black/[.08] dark:divide-white/[.145]">
          {rows.map((row) => (
            <tr key={getKey(row)} className="bg-white dark:bg-zinc-950">
              {columns.map((col) => (
                <td key={col.header} className="px-4 py-3 text-zinc-800 dark:text-zinc-200">
                  {col.accessor(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
