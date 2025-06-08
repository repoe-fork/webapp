import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import initSqlJs, { Database } from "sql.js";
// @ts-ignore
import wasm from "sql.js/dist/sql-wasm.wasm?url";
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
      fetch(url)
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
  const { sql, setSql } = useContext(SQLContext);
  return <TextareaAutosize value={sql} onChange={(e) => setSql(e.currentTarget.value)} />;
};

export const SQLContext = createContext<{
  sql: string;
  setSql: Dispatch<SetStateAction<string>>;
}>(null as any);

export const SQLViewer: FC<
  PropsWithChildren<{
    url: string;
  }>
> = ({ url, children = <BasicInput /> }) => {
  const query = useSuspenseQuery(getDatabase(url));
  const [sql, setSql] = useState("select sqlite_version()");
  const [res, err] = useMemo(() => {
    if (query.error) {
      return [undefined, query.error];
    } else if (!query.data) {
      return [];
    }
    try {
      return [query.data.exec(sql)];
    } catch (e) {
      return [undefined, e];
    }
  }, [query.data, sql]);

  return (
    <SQLContext value={{ sql, setSql }}>
      {children}
      {err ? <Alert severity="error">{String(err)}</Alert> : null}
      {res?.map((r, i) => <ResultTable key={i} result={r} />)}
    </SQLContext>
  );
};
