import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import initSqlJs, { Database } from "fts5-sql-bundle";
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
} from "react";
import { Alert } from "components/ui/alert";
import { Button } from "components/ui/button";

const SQL = initSqlJs({ locateFile: () => wasm });

export const getDatabase = (url: string) =>
  queryOptions({
    queryKey: ["database", url],
    queryFn: (): Promise<Database> =>
      fetch(url, { cache: "default" })
        .then((r) => r.arrayBuffer())
        .then((b) => SQL.then((({Database}) => new Database(new Uint8Array(b))))),
  });

type SqlValue = number | string | Uint8Array | null;
type QueryExecResult = {
  columns: string[];
  values: SqlValue[][];
};

const ResultTable: FC<{ result: QueryExecResult }> = ({ result: { columns, values } }) => {
  return (
    <div className="overflow-auto rounded-lg border border-slate-200">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            {columns.map((columnName) => (
              <th key={columnName} className="px-3 py-2 font-semibold">
                {columnName}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {values.map((row, rowIndex) => (
            <tr key={rowIndex} className="odd:bg-white even:bg-slate-50">
              {row.map((value, cellIndex) => (
                <td key={cellIndex} className="px-3 py-2 text-slate-700">
                  {value}
                </td>
              ))}
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
}>(null as any);

function runQuery(db: Database, sql: string, page: number = 0, pageSize: number = 0) {
  const results: QueryExecResult[] = [];

  try {
    // Prepare the statement
    const stmt = db.prepare(sql);

    // Get column names
    const columns = stmt.getColumnNames();
    const values: SqlValue[][] = [];

    // If pagination is enabled (pageSize > 0)
    if (pageSize > 0) {
      // Skip rows for previous pages
      let rowCount = 0;
      const startRow = page * pageSize;

      // Step through rows until we reach the start of the requested page
      while (rowCount < startRow && stmt.step()) {
        rowCount++;
      }

      // Fetch rows for the current page
      let pageRowCount = 0;
      while (pageRowCount < pageSize && stmt.step()) {
        const row = stmt.get();
        values.push(row);
        pageRowCount++;
      }
    } else {
      // No pagination, fetch all rows
      while (stmt.step()) {
        const row = stmt.get();
        values.push(row);
      }
    }

    // Add the result to the results array
    if (columns.length > 0) {
      results.push({ columns, values });
    }

    // Free the statement to release memory
    stmt.free();
  } catch (e) {
    // If there's an error, free any statements and rethrow
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
  const [sql, setSql] = useState("SELECT * FROM \"English\"('search for anything')");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10); // Default to 10 rows per page

  const [res, err] = useMemo(() => {
    if (query.error) {
      return [undefined, query.error];
    } else if (!query.data) {
      return [];
    }
    try {
      return [runQuery(query.data, sql, page, pageSize)];
    } catch (e) {
      return [undefined, e];
    }
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
    <SQLContext value={{ sql, setSql, page, setPage, pageSize, setPageSize }}>
      <div className="space-y-4">
        {children}
        {err ? <Alert variant="destructive">{String(err)}</Alert> : null}
        {res?.map((r, i) => <ResultTable key={i} result={r} />)}
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
