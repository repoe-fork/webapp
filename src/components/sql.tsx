import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { initSqlJs, Database } from "fts5-sql-bundle";
// @ts-ignore
import wasm from "fts5-sql-bundle/dist/sql-wasm.wasm?url";
import {
  createContext,
  Dispatch,
  FC,
  PropsWithChildren,
  SetStateAction,
  useContext,
  useMemo,
  useState,
  useEffect,
} from "react";
import { SearchWidget } from "./SearchWidget";
import { Alert } from "components/ui/alert";
import { Button } from "components/ui/button";
import { createVfsDbWorker } from "../lib/sqlite-vfs";
import { getDefaultStore } from "jotai";
import { dbLoadingProgress } from "../state/dbLoading";

const SQL = initSqlJs({ locateFile: () => wasm });

export const getDatabase = (url: string) =>
  queryOptions({
    queryKey: ["database", url],
    queryFn: async () => {
      const store = getDefaultStore();
      console.log("Fetching database from:", url);
      try {
        const db = await createVfsDbWorker(url);
        console.log("VFS database loaded successfully");
        return db;
      } catch (e) {
        console.warn("VFS failed, falling back to full download:", e);
        const response = await fetch(url, { cache: "default" });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const contentLength = response.headers.get("content-length");
        const total = contentLength ? parseInt(contentLength, 10) : 0;
        let loaded = 0;
        store.set(dbLoadingProgress, { loaded, total, url });

        const reader = response.body?.getReader();
        if (!reader) throw new Error("Failed to get reader from response body");

        const chunks: Uint8Array[] = [];
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
          loaded += value.length;
          store.set(dbLoadingProgress, { loaded, total, url });
          // Yield to event loop to allow UI to update
          await new Promise((r) => setTimeout(r, 0));
        }

        const b = new Uint8Array(loaded);
        let offset = 0;
        for (const chunk of chunks) {
          b.set(chunk, offset);
          offset += chunk.length;
        }

        const db = await SQL.then(({ Database }) => new Database(b));
        console.log("Fallback database loaded successfully");
        store.set(dbLoadingProgress, null);
        return db;
      }
    },
  });

type SqlValue = number | string | Uint8Array | null;
type QueryExecResult = {
  columns: string[];
  values: SqlValue[][];
  tableName?: string;
};

const ResultTable: FC<{ result: QueryExecResult }> = ({
  result: { columns, values, tableName },
}) => {
  const { worker, page, pageSize, setSql } = useContext(SQLContext);

  const findRelated = async (rowIndex: number) => {
    if (!tableName) return;
    const sourceRowId = page * pageSize + rowIndex;

    // Check if worker is VFS or Database
    const isVfs = worker.db && typeof worker.db.query === "function";

    let related: any[];
    if (isVfs) {
      related = await worker.db.query(
        `SELECT * FROM relations WHERE source_table = '${tableName}' AND source_row = ${sourceRowId}`,
      );
    } else {
      const stmt = worker.prepare(
        `SELECT * FROM relations WHERE source_table = '${tableName}' AND source_row = ${sourceRowId}`,
      );
      related = [];
      while (stmt.step()) {
        related.push(stmt.getAsObject());
      }
      stmt.free();
    }
    console.log("Related rows:", related);
    if (related.length > 0) {
      // Find the first target and show it
      const { target_table, target_row } = related[0];
      setSql(`SELECT * FROM ${target_table} WHERE rowid = ${target_row}`);
    } else {
      alert("No related rows found");
    }
  };

  const findReferencing = async (rowIndex: number) => {
    if (!tableName) return;
    const sourceRowId = page * pageSize + rowIndex;
    setSql(`SELECT * FROM relations WHERE target_table = '${tableName}' AND target_row = ${sourceRowId}`);
  };

  const handleSort = (column: string) => {
    if (!tableName) return;
    setSql(`SELECT * FROM ${tableName} ORDER BY "${column}"`);
  };

  return (
    <div className="overflow-auto rounded-lg border border-slate-200">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            {columns.map((columnName) => (
              <th
                key={columnName}
                className="cursor-pointer px-3 py-2 font-semibold hover:bg-slate-200"
                onClick={() => handleSort(columnName)}
              >
                {columnName}
              </th>
            ))}
            <th className="px-3 py-2 font-semibold text-center">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {values.map((row, rowIndex) => (
            <tr key={rowIndex} className="odd:bg-white even:bg-slate-50 hover:bg-blue-50">
              {row.map((value, cellIndex) => (
                <td key={cellIndex} className="px-3 py-2 text-slate-700 whitespace-nowrap overflow-hidden max-w-[300px] text-ellipsis">
                  {String(value)}
                </td>
              ))}
              <td className="px-3 py-2 text-center whitespace-nowrap">
                <div className="flex gap-2 justify-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    title="Find target row"
                    onClick={() => findRelated(rowIndex)}
                  >
                    →
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    title="Find referencing rows"
                    onClick={() => findReferencing(rowIndex)}
                  >
                    ←
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const BasicInput: FC = () => {
  const { sql, setSql, setPage } = useContext(SQLContext);

  // Reset to first page when SQL changes
  const handleSqlChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSql(e.currentTarget.value);
    setPage(0); // Reset to first page when query changes
  };

  return (
    <textarea
      className="min-h-[120px] w-full resize-y rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm"
      value={sql}
      onChange={handleSqlChange}
      rows={4}
    />
  );
};

export const SQLContext = createContext<{
  sql: string;
  setSql: Dispatch<SetStateAction<string>>;
  page: number;
  setPage: Dispatch<SetStateAction<number>>;
  pageSize: number;
  setPageSize: Dispatch<SetStateAction<number>>;
  worker: any;
}>(null as any);

async function runQuery(dbOrWorker: any, sql: string, page: number = 0, pageSize: number = 0) {
  const results: QueryExecResult[] = [];

  const isVfs = dbOrWorker.db && typeof dbOrWorker.db.query === 'function';

  try {
    let columns: string[] = [];
    let values: SqlValue[][] = [];

    if (isVfs) {
      // VFS logic
      let paginatedSql = sql;
      if (pageSize > 0 && !sql.toLowerCase().includes("limit")) {
        paginatedSql = `${sql} LIMIT ${pageSize} OFFSET ${page * pageSize}`;
      }
      const rows = await dbOrWorker.db.query(paginatedSql);
      columns = rows.length > 0 ? Object.keys(rows[0]) : [];
      values = rows.map((row: any) => columns.map((col) => row[col]));
    } else {
      // Legacy Database logic
      const stmt = dbOrWorker.prepare(sql);
      columns = stmt.getColumnNames();

      if (pageSize > 0) {
        let rowCount = 0;
        const startRow = page * pageSize;
        while (rowCount < startRow && stmt.step()) rowCount++;
        let pageRowCount = 0;
        while (pageRowCount < pageSize && stmt.step()) {
          values.push(stmt.get());
          pageRowCount++;
        }
      } else {
        while (stmt.step()) values.push(stmt.get());
      }
      stmt.free();
    }

    // Add the result to the results array
    if (columns.length > 0) {
      results.push({ columns, values, tableName: sql.match(/FROM\s+["']?([A-Za-z0-9_]+)["']?/i)?.[1] });
    }
  } catch (e) {
    throw e;
  }

  return results;
}

export const SQLViewer: FC<
  PropsWithChildren<{
    url: string;
  }>
> = ({ url, children = <BasicInput /> }) => {
  const query = useSuspenseQuery(getDatabase(url));
  const [sql, setSql] = useState('SELECT * FROM "English"');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10); // Default to 10 rows per page
  const [res, setRes] = useState<QueryExecResult[]>();
  const [err, setErr] = useState<any>();

  const [tableName, setTableName] = useState<string>();

  const handleSearch = (table: string, query: string) => {
    const ftsSql = query
      ? `SELECT * FROM ${table} WHERE ${table} MATCH '${query}' ORDER BY rank`
      : `SELECT * FROM ${table}`;
    setSql(ftsSql);
    setTableName(table);
    setPage(0);
  };

  useEffect(() => {
    const fetchResults = async () => {
      try {
        setErr(undefined);
        const results = await runQuery(query.data, sql, page, pageSize);
        setRes(results);
      } catch (e) {
        console.error("Query execution failed:", e);
        setErr(e);
      }
    };
    fetchResults();
  }, [query.data, sql, page, pageSize]);

  // Function to handle page changes
  const handleNextPage = () => {
    setPage((prev) => prev + 1);
  };

  const handlePrevPage = () => {
    setPage((prev) => Math.max(0, prev - 1));
  };

  // Check if there are results and if the current page has data
  const hasResults = res && res.length > 0 && res[0].values.length > 0;
  const hasMorePages = hasResults && res[0].values.length === pageSize;

  return (
    <SQLContext value={{ sql, setSql, page, setPage, pageSize, setPageSize, worker: query.data }}>
      <div className="space-y-4">
        <SearchWidget onSearch={handleSearch} />
        {children}
        {err ? <Alert variant="destructive">{String(err)}</Alert> : null}
        {res?.map((r, i) => (
          <ResultTable key={i} result={r} />
        ))}
      </div>

      {/* Pagination controls */}
      {pageSize > 0 && (
        <div className="mt-4 flex items-center justify-between">
          <Button variant="outline" onClick={handlePrevPage} disabled={page === 0}>
            Previous page
          </Button>
          <span className="text-sm text-slate-600">Page {page + 1}</span>
          <Button variant="outline" onClick={handleNextPage} disabled={!hasMorePages}>
            Next page
          </Button>
        </div>
      )}
    </SQLContext>
  );
};
