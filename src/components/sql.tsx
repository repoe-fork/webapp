import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import initSqlJs, { Database } from "sql.js";
import {
  Component,
  ComponentType,
  Dispatch,
  FC,
  SetStateAction,
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

const SQL = await initSqlJs();

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
type Input = ComponentType<{
  sql: string;
  setSql: Dispatch<SetStateAction<string>>;
}>;

const BasicInput: Input = ({ sql, setSql }) => (
  <TextareaAutosize
    value={sql}
    onChange={(e) => setSql(e.currentTarget.value)}
  />
);

const ResultTable: FC<{ result: QueryExecResult }> = ({
  result: { columns, values },
}) => {
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

export const SQLViewer: FC<{
  url: string;
  Component?: Input;
}> = ({ url, Component = BasicInput }) => {
  const db = useSuspenseQuery(getDatabase(url)).data;
  const [sql, setSql] = useState("SELECT * FROM relations");
  const [res, err] = useMemo(() => {
    try {
      return [db.exec(sql)];
    } catch (e) {
      return [undefined, e];
    }
  }, [sql]);

  return (
    <>
      <Component sql={sql} setSql={setSql} />
      {err && <Alert severity="error">{String(err)}</Alert>}
      {res?.map((r, i) => <ResultTable key={i} result={r} />)}
    </>
  );
};
