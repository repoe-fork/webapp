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
  useCallback,
} from "react";
import {
  useLocation,
  useNavigate,
} from "use-navigation-api";
import CodeMirror from "@uiw/react-codemirror";
import { sql as sqlLang, SQLite } from "@codemirror/lang-sql";
import { syntaxTree } from "@codemirror/language";
import { CompletionContext, CompletionResult } from "@codemirror/autocomplete";
import { Prec } from "@codemirror/state";
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
  const [relations, setRelations] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchRelations = async () => {
      if (!tableName || values.length === 0) return;
      const isVfs = worker.db && typeof worker.db.query === "function";
      const rowIds = values.map((_, i) => page * pageSize + i);
      const relSql = `SELECT DISTINCT source_column, target_table FROM relations WHERE source_table = '${tableName}' AND source_row IN (${rowIds.join(",")})`;

      let rels: any[];
      try {
        if (isVfs) {
          rels = await worker.db.query(relSql);
        } else {
          const stmt = worker.prepare(relSql);
          rels = [];
          while (stmt.step()) rels.push(stmt.getAsObject());
          stmt.free();
        }

        const relMap: Record<string, string> = {};
        for (const r of rels) {
          relMap[r.source_column] = r.target_table;
        }
        setRelations(relMap);
      } catch (e) {
        console.warn("Failed to fetch relations:", e);
      }
    };
    fetchRelations();
  }, [tableName, values, page, pageSize, worker]);

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
                <td
                  key={cellIndex}
                  className="px-3 py-2 text-slate-700 whitespace-nowrap overflow-hidden max-w-[300px] text-ellipsis"
                >
                  {relations[columns[cellIndex]] ? (
                    <button
                      className="text-blue-600 hover:underline"
                      onClick={() => {
                        const targetTable = relations[columns[cellIndex]];
                        const rowId = page * pageSize + rowIndex;
                        setSql(
                          `SELECT * FROM ${targetTable} WHERE rowid IN (SELECT target_row FROM relations WHERE source_table = '${tableName}' AND source_column = '${columns[cellIndex]}' AND source_row = ${rowId})`,
                        );
                      }}
                    >
                      {String(value)}
                    </button>
                  ) : (
                    String(value)
                  )}
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

const SqlEditor: FC = () => {
  const { sql, setSql, setPage, worker } = useContext(SQLContext);
  const [schema, setSchema] = useState<Record<string, { name: string; type: string }[]>>({});
  const [relationsInfo, setRelationsInfo] = useState<Record<string, { column: string; target: string }[]>>({});

  useEffect(() => {
    const fetchSchema = async () => {
      if (!worker) return;
      try {
        const isVfs = worker.db && typeof worker.db.query === "function";
        // Check if pragma_table_info is available
        const hasPragmaTableInfo = async () => {
          try {
            if (isVfs) {
              await worker.db.query("SELECT * FROM pragma_table_info('relations') LIMIT 1");
            } else {
              worker.db.exec("SELECT * FROM pragma_table_info('relations') LIMIT 1");
            }
            return true;
          } catch (e) {
            return false;
          }
        };

        let rows: any[] = [];
        if (await hasPragmaTableInfo()) {
          const schemaSql =
            "SELECT m.name as table_name, p.name as column_name, p.type FROM sqlite_master m JOIN pragma_table_info(m.name) p WHERE m.type='table' AND m.name NOT LIKE 'sqlite_%'";
          if (isVfs) {
            rows = await worker.db.query(schemaSql);
          } else {
            const stmt = worker.prepare(schemaSql);
            while (stmt.step()) rows.push(stmt.getAsObject());
            stmt.free();
          }
        } else {
          // Fallback for older SQLite versions
          const tableSql = "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'";
          let tables: any[];
          if (isVfs) {
            tables = await worker.db.query(tableSql);
          } else {
            const stmt = worker.prepare(tableSql);
            tables = [];
            while (stmt.step()) tables.push(stmt.getAsObject());
            stmt.free();
          }

          for (const t of tables) {
            const tableName = t.name;
            rows.push({ table_name: tableName, column_name: "", type: "" });
          }
        }

        const newSchema: Record<string, { name: string; type: string }[]> = {};
        for (const row of rows) {
          if (!newSchema[row.table_name]) newSchema[row.table_name] = [];
          if (row.column_name) newSchema[row.table_name].push({ name: row.column_name, type: row.type });
        }
        setSchema(newSchema);

        // Fetch relations info for smart joins
        const relInfoSql = "SELECT DISTINCT source_table, source_column, target_table FROM relations";
        let relRows: any[] = [];
        try {
          if (isVfs) {
            relRows = await worker.db.query(relInfoSql);
          } else {
            const stmt = worker.prepare(relInfoSql);
            while (stmt.step()) relRows.push(stmt.getAsObject());
            stmt.free();
          }
          const newRelInfo: Record<string, { column: string; target: string }[] > = {};
          for (const row of relRows) {
            if (!newRelInfo[row.source_table]) newRelInfo[row.source_table] = [];
            newRelInfo[row.source_table].push({ column: row.source_column, target: row.target_table });
          }
          setRelationsInfo(newRelInfo);
        } catch (e) {
          console.warn("Failed to fetch relations info for autocompletion:", e);
        }
      } catch (e) {
        console.warn("Failed to fetch database schema for autocompletion:", e);
      }
    };
    fetchSchema();
  }, [worker]);

  const smartJoinCompletion = useCallback(
    (context: CompletionContext): CompletionResult | null => {
      // Match "JOIN" followed by optional whitespace and partial words
      const word = context.matchBefore(/JOIN[\s\w"']*$/i);
      if (!word) return null;

      const tree = syntaxTree(context.state);

      let lastTable = "";
      let lastAlias = "";

      // Iterate the tree to find the table/alias before the JOIN
      tree.iterate({
        from: 0,
        to: word.from,
        enter: (node) => {
          if (node.name === "TableIdentifier" || node.name === "Identifier") {
            let name = context.state.sliceDoc(node.from, node.to);
            if (name.startsWith('"') && name.endsWith('"')) name = name.slice(1, -1);
            if (name.startsWith("'") && name.endsWith("'")) name = name.slice(1, -1);

            // If it's a known table, it's our base table
            if (schema[name]) {
              lastTable = name;
              lastAlias = "";
            } else {
              // Otherwise it might be an alias for the last found table
              const upper = name.toUpperCase();
              if (
                lastTable &&
                upper !== "JOIN" &&
                upper !== "FROM" &&
                upper !== "SELECT" &&
                name !== "*"
              ) {
                lastAlias = name;
              }
            }
          } else if (node.name === "AliasIdentifier") {
            lastAlias = context.state.sliceDoc(node.from, node.to);
          }
        },
      });

      const effectiveTable = lastAlias || lastTable;
      const baseTable = lastTable; // The actual table name for relations lookup

      if (!baseTable || !relationsInfo[baseTable]) return null;

      const options = relationsInfo[baseTable].flatMap((rel) => {
        const suggestions = [];

        // Find the column type
        const columnInfo = schema[baseTable].find((c) => c.name === rel.column);
        const isJson = columnInfo?.type?.toLowerCase() === "json";

        // Option A: Full join through relations (works for both 1:1 and 1:N)
        const relAlias = `rel_${rel.column}`;
        const targetAlias = `${rel.target.toLowerCase()}_${rel.column}`;

        suggestions.push({
          label: `JOIN via relations (${rel.column} → ${rel.target})`,
          displayLabel: `JOIN via relations: ${rel.column} → ${rel.target}`,
          apply: `JOIN relations ${relAlias} ON ${relAlias}.source_row = ${effectiveTable}.rowid AND ${relAlias}.source_table = '${baseTable}' AND ${relAlias}.source_column = '${rel.column}' JOIN ${rel.target} ${targetAlias} ON ${targetAlias}.rowid = ${relAlias}.target_row`,
          type: "keyword",
          detail: "Smart Join (handles 1:N)",
        });

        // Option B: Direct join (only for 1:1 / Many-to-One)
        if (!isJson) {
          suggestions.push({
            label: `JOIN direct (${rel.column} → ${rel.target})`,
            apply: `JOIN ${rel.target} ${targetAlias} ON ${targetAlias}.rowid = ${effectiveTable}.${rel.column}`,
            type: "keyword",
            detail: "Direct Join (Many-to-One)",
          });
        }

        return suggestions;
      });

      return {
        from: word.from,
        options,
      };
    },
    [relationsInfo, schema],
  );

  const schemaForLang = useMemo(() => {
    const res: Record<string, string[]> = {};
    for (const [table, cols] of Object.entries(schema)) {
      res[table] = cols.map((c) => c.name);
    }
    return res;
  }, [schema]);

  const sqlSupport = useMemo(() => sqlLang({ schema: schemaForLang, dialect: SQLite }), [schemaForLang]);

  const extensions = useMemo(
    () => [
      sqlSupport,
      Prec.high(
        sqlSupport.language.data.of({
          autocomplete: smartJoinCompletion,
        }),
      ),
    ],
    [sqlSupport, smartJoinCompletion],
  );

  const onChange = useCallback(
    (value: string) => {
      setSql(value);
      setPage(0);
    },
    [setSql, setPage],
  );

  return (
    <div
      className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm"
      data-testid="sql-editor"
      data-schema-loaded={Object.keys(schema).length > 0}
      data-relations-loaded={Object.keys(relationsInfo).length > 0}
    >
      <CodeMirror
        value={sql}
        height="120px"
        extensions={extensions}
        onChange={onChange}
        className="text-sm"
      />
    </div>
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
    initialSql?: string;
  }>
> = ({ url, initialSql, children = <SqlEditor /> }) => {
  const query = useSuspenseQuery(getDatabase(url));
  const [sql, setSql] = useState(initialSql || 'SELECT * FROM "English"');
  const [debouncedSql, setDebouncedSql] = useState(sql);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10); // Default to 10 rows per page
  const [res, setRes] = useState<QueryExecResult[]>();
  const [err, setErr] = useState<any>();

  const location = useLocation();
  const navigation = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSql(sql);
    }, 1000);
    return () => clearTimeout(timer);
  }, [sql]);

  useEffect(() => {
    if (debouncedSql && debouncedSql !== initialSql) {
      const next = location.clone().setQuery("sql", debouncedSql);
      navigation.navigate(String(next), { history: "replace" });
    }
  }, [debouncedSql, location, navigation, initialSql]);

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
    const timer = setTimeout(() => {
      const fetchResults = async () => {
        if (!sql.trim()) return;
        try {
          setErr(undefined);
          const results = await runQuery(query.data, sql, page, pageSize);
          setRes(results);
        } catch (e: any) {
          // Only show error if it's not a common "incomplete query" error while typing
          const errorMsg = String(e);
          if (
            !errorMsg.includes("near \"S\"") &&
            !errorMsg.includes("near \"SELECT\"") &&
            !errorMsg.includes("near \"JOIN\"") &&
            !errorMsg.includes("incomplete input")
          ) {
            console.error("Query execution failed:", e);
            setErr(e);
          }
        }
      };
      fetchResults();
    }, 800); // Increased debounce to avoid errors while typing
    return () => clearTimeout(timer);
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
