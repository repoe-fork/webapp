import React from "react";

export type ColorLegendItem = {
  label: string;
  color: string;
};

export const ColorLegend: React.FC<{
  title: string;
  items: ColorLegendItem[];
  onSelect?: (label: string) => void;
}> = ({ title, items, onSelect }) => {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <span className="text-xs text-slate-500">{items.length} entries</span>
      </div>
      <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <li key={item.label}>
            <button
              type="button"
              onClick={() => onSelect?.(item.label)}
              className="group flex w-full items-center gap-2 rounded-md border border-transparent px-2 py-1 text-left text-xs text-slate-700 hover:border-slate-200 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400">
              <span
                className="h-3 w-3 shrink-0 rounded-sm ring-1 ring-slate-200"
                style={{ backgroundColor: item.color }}
              />
              <span className="truncate">{item.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};
