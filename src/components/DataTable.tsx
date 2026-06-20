import { Inbox } from "lucide-react";

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
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-navy/15 py-12 text-navy/50">
        <Inbox className="h-8 w-8" strokeWidth={1.5} />
        <p className="text-sm">{emptyMessage ?? "No records found."}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-navy/10 shadow-sm">
      <table className="min-w-full divide-y divide-navy/10 text-sm">
        <thead className="bg-navy text-gold-light">
          <tr>
            {columns.map((col) => (
              <th
                key={col.header}
                className="px-4 py-3 text-left font-medium"
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-navy/10">
          {rows.map((row) => (
            <tr key={getKey(row)} className="bg-white transition-colors hover:bg-gold-light/20">
              {columns.map((col) => (
                <td key={col.header} className="px-4 py-3 text-navy-dark">
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
