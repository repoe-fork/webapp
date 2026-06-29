import * as React from "react";

type AccordionProps = {
  title: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
};

export function Accordion({ title, children, defaultOpen = false }: AccordionProps) {
  return (
    <details className="rounded-md border border-slate-200 bg-white shadow-sm" open={defaultOpen}>
      <summary className="cursor-pointer select-none px-3 py-2 text-sm font-medium text-slate-900">
        {title}
      </summary>
      <div className="border-t border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
        {children}
      </div>
    </details>
  );
}
