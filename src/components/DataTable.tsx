import type { ReactNode } from 'react';

interface Column<T> {
  header: string;
  accessor: keyof T | ((row: T) => ReactNode);
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  isLoading?: boolean;
  emptyMessage?: string;
}

export function DataTable<T extends { id: number }>({
  data,
  columns,
  onEdit,
  onDelete,
  isLoading = false,
  emptyMessage = 'No hay datos disponibles',
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="py-12 text-center text-gray-500 dark:text-gray-400">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-gray-200 shadow-sm dark:border-gray-800">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
        <thead className="bg-gray-50 dark:bg-gray-800/60">
          <tr>
            {columns.map((column, index) => (
              <th
                key={index}
                className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300 ${
                  column.className || ''
                }`}
              >
                {column.header}
              </th>
            ))}
            {(onEdit || onDelete) && (
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                Acciones
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-800 dark:bg-gray-900">
          {data.map((row) => (
            <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
              {columns.map((column, index) => (
                <td
                  key={index}
                  className={`whitespace-nowrap px-4 py-3 text-sm text-gray-900 dark:text-gray-100 ${
                    column.className || ''
                  }`}
                >
                  {typeof column.accessor === 'function'
                    ? column.accessor(row)
                    : String(row[column.accessor])}
                </td>
              ))}
              {(onEdit || onDelete) && (
                <td className="whitespace-nowrap px-4 py-3 text-sm font-medium">
                  <div className="flex items-center gap-2">
                    {onEdit && (
                      <button
                        onClick={() => onEdit(row)}
                        className="text-indigo-600 transition-colors hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                        aria-label="Editar" title="Editar"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => onDelete(row)}
                        className="text-red-600 transition-colors hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                        aria-label="Eliminar" title="Eliminar"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
