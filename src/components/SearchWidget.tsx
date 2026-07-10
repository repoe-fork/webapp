import { FC, useState } from "react";
import { Button } from "components/ui/button";

export const SearchWidget: FC<{
  onSearch: (table: string, query: string, orderByRank: boolean) => void;
}> = ({ onSearch }) => {
  const [table, setTable] = useState("");
  const [query, setQuery] = useState("");
  const [orderByRank, setOrderByRank] = useState(true);

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
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={orderByRank}
          onChange={(e) => setOrderByRank(e.target.checked)}
          id="orderByRank"
        />
        <label htmlFor="orderByRank" className="text-sm">Order by Rank</label>
        <Button onClick={() => onSearch(table, query, orderByRank)}>Search</Button>
      </div>
    </div>
  );
};
