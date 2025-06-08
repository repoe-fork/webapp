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
import {
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextareaAutosize,
} from "@mui/material";

const SQL = await initSqlJs({ locateFile: () => wasm });

export const getDatabase = (url: string) =>
  queryOptions({
    queryKey: ["database", url],
    queryFn: (): Promise<Database> =>
      fetch(url, { cache: "default" })
        .then((r) => r.arrayBuffer())
        .then((b) => new SQL.Database(new Uint8Array(b))),
  });

type SqlValue = number | string | Uint8Array | null;
type QueryExecResult = {
  columns: string[];
  values: SqlValue[][];
};

const ResultTable: FC<{ result: QueryExecResult }> = ({ result: { columns, values } }) => {
  return (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            {columns.map((columnName) => (
              <TableCell key={columnName}>{columnName}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {values.map((row, i) => (
            <TableRow key={columns[i]}>
              {row.map((value, i) => (
                <TableCell key={i}>{value}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

const BasicInput: FC = () => {
  const { sql, setSql, setPage } = useContext(SQLContext);

  // Reset to first page when SQL changes
  const handleSqlChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSql(e.currentTarget.value);
    setPage(0); // Reset to first page when query changes
  };

  return <TextareaAutosize style={{ width: "100%" }} value={sql} onChange={handleSqlChange} />;
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
  const [sql, setSql] = useState("SELECT * FROM \"English_search\"('search for anything')");
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
      {children}
      {err ? <Alert severity="error">{String(err)}</Alert> : null}
      {res?.map((r, i) => <ResultTable key={i} result={r} />)}

      {/* Pagination controls */}
      {pageSize > 0 && (
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "1rem" }}>
          <button onClick={handlePrevPage} disabled={page === 0}>
            Previous Page
          </button>
          <span>Page {page + 1}</span>
          <button onClick={handleNextPage} disabled={!hasMorePages}>
            Next Page
          </button>
        </div>
      )}
    </SQLContext>
  );
};
