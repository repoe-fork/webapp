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
import CodeMirror, { keymap } from "@uiw/react-codemirror";
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
  result: { columns, values, tableName: resultTableName },
}) => {
  const { worker, page, pageSize, setSql, onNavigate, languages } = useContext(SQLContext);
  const [relations, setRelations] = useState<Record<string, string>>({});

  const tableColIndex = columns.indexOf("table");
  const rowColIndex = columns.findIndex(c => c.toLowerCase() === "row" || c.toLowerCase() === "rowid");

  const sourceTableColIndex = columns.indexOf("source_table");
  const sourceRowColIndex = columns.indexOf("source_row");

  const isFtsTable = resultTableName && languages.includes(resultTableName);

  const getTargetTable = (rowIndex: number) => {
    if (tableColIndex !== -1) return String(values[rowIndex][tableColIndex]);
    if (resultTableName === "relations" && sourceTableColIndex !== -1)
      return String(values[rowIndex][sourceTableColIndex]);
    return resultTableName;
  };

  const getTargetRowId = (rowIndex: number) => {
    if (rowColIndex !== -1) return Number(values[rowIndex][rowColIndex]);
    if (resultTableName === "relations" && sourceRowColIndex !== -1)
      return Number(values[rowIndex][sourceRowColIndex]);
    return page * pageSize + rowIndex;
  };

  useEffect(() => {
    const fetchRelations = async () => {
      if (values.length === 0) return;
      const isVfs = worker.db && typeof worker.db.query === "function";

      let relSql: string;
      if (tableColIndex !== -1 && rowColIndex !== -1) {
        const uniqueTables = Array.from(new Set(values.map((v) => String(v[tableColIndex]))));
        relSql = `SELECT DISTINCT source_table, source_column, target_table FROM relations WHERE source_table IN (${uniqueTables.map((t) => `'${t}'`).join(",")})`;
      } else {
        if (!resultTableName) return;
        const rowIds = values.map((_, i) => getTargetRowId(i));
        relSql = `SELECT DISTINCT source_column, target_table FROM relations WHERE source_table = '${resultTableName}' AND source_row IN (${rowIds.join(",")})`;
      }

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
  }, [resultTableName, values, page, pageSize, worker, tableColIndex, rowColIndex]);

  const findRelated = async (rowIndex: number) => {
    const targetTable = getTargetTable(rowIndex);
    const targetRowId = getTargetRowId(rowIndex);
    if (!targetTable) return;

    if (resultTableName === "relations" || isFtsTable) {
      const newSql = `SELECT rowid, * FROM "${targetTable}" WHERE rowid = ${targetRowId}`;
      setSql(newSql);
      onNavigate(newSql);
      return;
    }

    const isVfs = worker.db && typeof worker.db.query === "function";

    let related: any[];
    const query = `SELECT * FROM relations WHERE source_table = '${targetTable}' AND source_row = ${targetRowId}`;
    if (isVfs) {
      related = await worker.db.query(query);
    } else {
      const stmt = worker.prepare(query);
      related = [];
      while (stmt.step()) {
        related.push(stmt.getAsObject());
      }
      stmt.free();
    }
    console.log("Related rows:", related);
    if (related.length > 0) {
      const { target_table, target_row } = related[0];
      const newSql = `SELECT rowid, * FROM "${target_table}" WHERE rowid = ${target_row}`;
      setSql(newSql);
      onNavigate(newSql);
    } else {
      alert("No related rows found");
    }
  };

  const findReferencing = async (rowIndex: number) => {
    const targetTable = getTargetTable(rowIndex);
    const targetRowId = getTargetRowId(rowIndex);
    if (!targetTable) return;
    const newSql = `SELECT * FROM relations WHERE target_table = '${targetTable}' AND target_row = ${targetRowId}`;
    setSql(newSql);
    onNavigate(newSql);
  };

  const handleSort = (column: string) => {
    if (!resultTableName) return;
    const isFts = languages.includes(resultTableName);
    const selectClause = isFts ? "*" : "rowid, *";
    const newSql = `SELECT ${selectClause} FROM "${resultTableName}" ORDER BY "${column}"`;
    setSql(newSql);
    onNavigate(newSql);
  };

  return (
    <div className="overflow-auto rounded-lg border border-slate-200 bg-white shadow-sm max-h-[600px]">
      <table className="min-w-full text-left text-sm border-separate border-spacing-0">
        <thead className="sticky top-0 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-600 shadow-[0_1px_0_0_rgba(0,0,0,0.05)]">
          <tr>
            {columns.map((columnName) => (
              <th
                key={columnName}
                className="cursor-pointer px-4 py-3 border-b border-slate-200 hover:bg-slate-100 transition-colors"
                onClick={() => handleSort(columnName)}
              >
                {columnName}
              </th>
            ))}
            <th className="px-4 py-3 border-b border-slate-200 text-center">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {values.map((row, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-blue-50/50 transition-colors group">
              {row.map((value, cellIndex) => (
                <td
                  key={cellIndex}
                  className="px-4 py-2 text-slate-700 whitespace-nowrap overflow-hidden max-w-[400px] text-ellipsis border-b border-slate-50"
                >
                  {relations[columns[cellIndex]] ? (
                    <button
                      className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                      onClick={() => {
                        const targetTable = relations[columns[cellIndex]];
                        const rowId = getTargetRowId(rowIndex);
                        const sourceTable = getTargetTable(rowIndex);
                        const newSql = `SELECT * FROM "${targetTable}" WHERE rowid IN (SELECT target_row FROM relations WHERE source_table = '${sourceTable}' AND source_column = '${columns[cellIndex]}' AND source_row = ${rowId})`;
                        setSql(newSql);
                        onNavigate(newSql);
                      }}
                    >
                      {String(value)}
                    </button>
                  ) : (
                    String(value)
                  )}
                </td>
              ))}
              <td className="px-4 py-2 text-center whitespace-nowrap border-b border-slate-50">
                <div className="flex gap-1 justify-center opacity-40 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    title="Find related (target) row"
                    onClick={() => findRelated(rowIndex)}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                    title="Find referencing rows"
                    onClick={() => findReferencing(rowIndex)}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 1 1-7.6-10.8 8.5 8.5 0 0 1 6.3 2.7l-3.3 3.3H21V3l-3.3 3.3" />
                    </svg>
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
  const { sql, setSql, setPage, worker, onRunQuery } = useContext(SQLContext);
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
      keymap.of([
        {
          key: "Ctrl-Enter",
          run: () => {
            onRunQuery();
            return true;
          },
        },
        {
          key: "Cmd-Enter",
          run: () => {
            onRunQuery();
            return true;
          },
        },
      ]),
    ],
    [sqlSupport, smartJoinCompletion, onRunQuery],
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
  onNavigate: (newSql: string) => void;
  onRunQuery: () => void;
  languages: string[];
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
      const tableName = sql.match(/FROM\s+["']?([A-Za-z0-9_]+)["']?/i)?.[1];
      results.push({ columns, values, tableName });
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
  const [committedSql, setCommittedSql] = useState(sql);
  const [page, setPage] = useState(0);

  useEffect(() => {
    const nextSql = initialSql || 'SELECT * FROM "English"';
    if (nextSql !== sql) {
      setSql(nextSql);
      setCommittedSql(nextSql);
    }
  }, [initialSql]);
  const [pageSize, setPageSize] = useState(10); // Default to 10 rows per page
  const [res, setRes] = useState<QueryExecResult[]>();
  const [err, setErr] = useState<any>();
  const [languages, setLanguages] = useState<string[]>(["English"]);

  const location = useLocation();
  const navigation = useNavigate();

  const onNavigate = useCallback(
    (newSql: string) => {
      setCommittedSql(newSql);
      const next = location.clone().setQuery("sql", newSql);
      navigation.navigate(String(next), { history: "push" });
    },
    [location, navigation],
  );

  useEffect(() => {
    const fetchLanguages = async () => {
      if (!query.data) return;
      try {
        const langSql = "SELECT name FROM sqlite_master WHERE type='table' AND sql LIKE '%FTS5%'";
        let rows: any[] = [];
        if ('db' in query.data && typeof query.data.db.query === "function") {
          rows = await query.data.db.query(langSql);
        } else if ('prepare' in query.data) {
          const stmt = query.data.prepare(langSql);
          while (stmt.step()) rows.push(stmt.getAsObject());
          stmt.free();
        }
        if (rows.length > 0) {
          setLanguages(rows.map((r) => r.name));
        }
      } catch (e) {
        console.warn("Failed to fetch languages:", e);
      }
    };
    fetchLanguages().catch(console.error);
  }, [query.data]);

  const handleSearch = (table: string, queryText: string) => {
    const ftsSql = queryText
      ? `SELECT * FROM "${table}" WHERE "${table}" MATCH '${queryText.replace(/'/g, "''")}' ORDER BY rank`
      : `SELECT * FROM "${table}"`;
    setSql(ftsSql);
    setPage(0);
    onNavigate(ftsSql);
  };

  const handleRunQuery = () => {
    onNavigate(sql);
  };

  useEffect(() => {
    const fetchResults = async () => {
      if (!committedSql.trim()) return;
      try {
        setErr(undefined);
        const results = await runQuery(query.data, committedSql, page, pageSize);
        setRes(results);
      } catch (e: any) {
        console.error("Query execution failed:", e);
        setErr(e);
      }
    };
    fetchResults();
  }, [query.data, committedSql, page, pageSize]);

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
    <SQLContext
      value={{
        sql,
        setSql,
        page,
        setPage,
        pageSize,
        setPageSize,
        worker: query.data,
        onNavigate,
        onRunQuery: handleRunQuery,
        languages,
      }}
    >
      <div className="space-y-6">
        <SearchWidget
          languages={languages}
          onSearch={handleSearch}
          onRunQuery={handleRunQuery}
        />
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">SQL Query</h3>
            <span className="text-xs text-slate-500 font-medium">Ctrl+Enter to run</span>
          </div>
          {children}
        </div>
        {err ? (
          <Alert variant="destructive">
            {String(err)}
          </Alert>
        ) : null}
        <div className="space-y-2">
          {res && res.length > 0 && (
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Results</h3>
              <span className="text-xs text-slate-500 font-medium">
                Showing {res[0].values.length} rows
              </span>
            </div>
          )}
          {res?.map((r, i) => (
            <ResultTable key={i} result={r} />
          ))}
        </div>
      </div>

      {/* Pagination controls */}
      {pageSize > 0 && (
        <div className="mt-8 flex items-center justify-between bg-slate-50 p-4 rounded-lg border border-slate-200">
          <Button variant="outline" size="sm" onClick={handlePrevPage} disabled={page === 0}>
            Previous
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-tighter">Page</span>
            <span className="flex items-center justify-center h-7 w-7 rounded bg-white border border-slate-200 text-sm font-bold text-blue-600 shadow-sm">
              {page + 1}
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={handleNextPage} disabled={!hasMorePages}>
            Next
          </Button>
        </div>
      )}
    </SQLContext>
  );
};
