import { FC, useEffect, useState } from "react";
import { Button } from "components/ui/button";

export const SearchWidget: FC<{
  languages: string[];
  onChange: (sql: string) => void;
  onRunQuery: () => void;
}> = ({ languages, onChange, onRunQuery }) => {
  const [table, setTable] = useState("English");
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (query) {
      onChange(
        `SELECT * FROM "${table}" WHERE "${table}" MATCH '${query.replace(/'/g, "''")}' ORDER BY rank`,
      );
    }
  }, [query, table, onChange]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onRunQuery();
      }}
      className="flex flex-col gap-4 p-5 bg-white rounded-lg border border-slate-200 shadow-sm"
      data-testid="search-widget">
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex flex-1 gap-2">
          <input
            className="flex-1 rounded-md border border-slate-200 px-4 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
            placeholder={`Find ${table} text in any .dat file...`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select
            className="w-32 rounded-md border border-slate-200 px-3 py-2 text-sm bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            value={table}
            onChange={(e) => setTable(e.target.value)}>
            {languages.map((lang) => (
              <option key={lang} value={lang}>
                {lang}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <Button type="submit" variant="primary">
            Run Query
          </Button>
        </div>
      </div>
    </form>
  );
};
