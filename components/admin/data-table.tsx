'use client';

import { Search, Filter } from 'lucide-react';
import { useState } from 'react';

type Column<T> = {
  key: string;
  header: string;
  render: (item: T) => React.ReactNode;
  className?: string;
};

type DataTableProps<T> = {
  data: T[];
  columns: Column<T>[];
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  actions?: React.ReactNode;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
};

export function DataTable<T extends { id: string }>({
  data,
  columns,
  searchPlaceholder = 'Buscar...',
  onSearch,
  actions,
  emptyMessage = 'Nenhum registro encontrado',
  emptyIcon,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('');

  const handleSearch = (value: string) => {
    setSearch(value);
    onSearch?.(value);
  };

  return (
    <div className="bg-[#0a1122] border border-[rgba(38,51,86,0.7)] rounded-xl overflow-hidden">
      {(onSearch || actions) && (
        <div className="flex items-center gap-3 p-4 border-b border-[rgba(38,51,86,0.5)]">
          {onSearch && (
            <div className="relative flex-1 max-w-md">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full h-10 pl-9 pr-4 bg-[#050912] border border-[rgba(38,51,86,0.7)] rounded-lg text-sm text-white placeholder-muted focus:outline-none focus:border-accent/50"
              />
            </div>
          )}
          {actions}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[rgba(38,51,86,0.5)]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="text-left text-xs font-medium text-muted uppercase tracking-wider px-5 py-4"
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr
                key={item.id}
                className="border-b border-[rgba(38,51,86,0.3)] hover:bg-[rgba(109,40,217,0.04)] transition-colors"
              >
                {columns.map((col) => (
                  <td key={col.key} className={`px-5 py-4 ${col.className ?? ''}`}>
                    {col.render(item)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-muted">
          {emptyIcon}
          <p className="mt-2 text-sm">{emptyMessage}</p>
        </div>
      )}
    </div>
  );
}
