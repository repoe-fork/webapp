/// <reference types="vite/client" />
import { createDbWorker } from "sql.js-httpvfs";
import workerUrl from "sql.js-httpvfs/dist/sqlite.worker.js?url";
import wasmUrl from "sql.js-httpvfs/dist/sql-wasm.wasm?url";

export async function createVfsDbWorker(url: string) {
  const databaseLengthBytes = (
    await fetch(url + ".json")
      .then((r) => r.json())
      .catch((_) => {})
  )?.size;
  return await createDbWorker(
    [
      {
        from: "inline",
        config: {
          serverMode: "chunked",
          urlPrefix: url + ".",
          requestChunkSize: 16384,
          serverChunkSize: 10 * 1024 * 1024,
          suffixLength: 2,
          databaseLengthBytes,
        },
      },
    ],
    workerUrl,
    wasmUrl,
  );
}
