import { FC, useState } from "react";
import { Button } from "components/ui/button";

export const SearchWidget: FC<{
  languages: string[];
  onSearch: (table: string, query: string) => void;
  onRunQuery: () => void;
}> = ({ languages, onSearch, onRunQuery }) => {
  const [table, setTable] = useState("English");
  const [query, setQuery] = useState("");

  return (
    <div className="flex flex-col gap-4 p-5 bg-white rounded-lg border border-slate-200 shadow-sm" data-testid="search-widget">
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex flex-1 gap-2">
          <select
            className="w-32 rounded-md border border-slate-200 px-3 py-2 text-sm bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            value={table}
            onChange={(e) => setTable(e.target.value)}
          >
            {languages.map((lang) => (
              <option key={lang} value={lang}>
                {lang}
              </option>
            ))}
          </select>
          <input
            className="flex-1 rounded-md border border-slate-200 px-4 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
            placeholder="Search database text (FTS5)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSearch(table, query);
            }}
          />
        </div>
        <div className="flex gap-2">
          <Button variant="primary" onClick={() => onSearch(table, query)}>
            Search Text
          </Button>
          <Button variant="secondary" onClick={onRunQuery}>
            Run Query
          </Button>
        </div>
      </div>
    </div>
  );
};
