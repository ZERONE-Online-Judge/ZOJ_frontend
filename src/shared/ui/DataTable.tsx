import type { ReactNode } from 'react';
import { sharedUiText } from '@/data/uiText';

type DataTableProps = {
  columns: string[];
  rows: ReactNode[][];
  emptyMessage?: string;
};

export default function DataTable({
  columns,
  rows,
  emptyMessage = sharedUiText.emptyTable,
}: DataTableProps) {
  return (
    <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold tracking-normal text-slate-600 uppercase">
            <tr>
              {columns.map((column) => (
                <th
                  className="border-b border-slate-200 px-4 py-3 whitespace-nowrap"
                  key={column}
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800">
            {rows.length > 0 ? (
              rows.map((row, rowIndex) => (
                <tr
                  className="transition hover:bg-slate-50"
                  key={`row-${rowIndex}`}
                >
                  {row.map((cell, cellIndex) => (
                    <td
                      className="px-4 py-3 align-middle"
                      key={`cell-${rowIndex}-${cellIndex}`}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  className="px-4 py-8 text-center text-slate-500"
                  colSpan={columns.length}
                >
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
