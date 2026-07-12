/// <reference types="vite/client" />
import { createDbWorker } from "sql.js-httpvfs";
import workerUrl from "sql.js-httpvfs/dist/sqlite.worker.js?url";
import wasmUrl from "sql.js-httpvfs/dist/sql-wasm.wasm?url";

export async function createVfsDbWorker(url: string) {
  const worker = await createDbWorker(
    [
      {
        from: "inline",
        config: {
          serverMode: "full",
          url: url,
          requestChunkSize: 16384,
        },
      },
    ],
    workerUrl,
    wasmUrl
  );
  return worker;
}
