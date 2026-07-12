import { FC, useState } from "react";
import { Button } from "components/ui/button";

export const SearchWidget: FC<{
  onSearch: (table: string, query: string) => void;
}> = ({ onSearch }) => {
  const [table, setTable] = useState("English");
  const [query, setQuery] = useState("");

  return (
    <div className="flex flex-col gap-2 p-4 bg-slate-50 rounded-md border border-slate-200">
      <div className="flex gap-2">
        <input
          className="flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm"
          placeholder="Table name"
          value={table}
          onChange={(e) => setTable(e.target.value)}
        />
        <input
          className="flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm"
          placeholder="Search query (FTS5)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSearch(table, query);
          }}
        />
        <Button onClick={() => onSearch(table, query)}>Search</Button>
      </div>
    </div>
  );
};
