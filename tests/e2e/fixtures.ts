import { test as base, expect, Page } from "@playwright/test";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const cacheDir = process.env.PLAYWRIGHT_CACHE_DIR ?? ".playwright-cache";
const cacheableHosts = new Set(["repoe-fork.github.io", "ggpk.exposed", "i.ggpk.exposed"]);

export async function waitForCascadingLoads(page: Page, timeout = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    await page.waitForLoadState("networkidle");
    const skeletonCount = await page.locator("text=/loading/i").count();
    if (skeletonCount === 0) {
      // Small grace period to ensure no new requests are kicked off by the just-loaded data
      await page.waitForTimeout(200);
      const newSkeletonCount = await page.locator("text=/loading/i").count();
      if (newSkeletonCount === 0) {
        return;
      }
    }
    await page.waitForTimeout(100);
  }
}

type CachedResponse = {
  status: number;
  headers: Record<string, string>;
  body: Buffer;
};

const ensureCacheDir = async () => {
  await fs.mkdir(cacheDir, { recursive: true });
};

const cachePathsFor = (url: string) => {
  const key = createHash("sha256").update(url).digest("hex");
  return {
    metaPath: path.join(cacheDir, `${key}.json`),
    bodyPath: path.join(cacheDir, `${key}.bin`),
  };
};

const readCache = async (url: string): Promise<CachedResponse | null> => {
  const { metaPath, bodyPath } = cachePathsFor(url);
  try {
    const [metaRaw, body] = await Promise.all([
      fs.readFile(metaPath, "utf8"),
      fs.readFile(bodyPath),
    ]);
    const meta = JSON.parse(metaRaw) as { status: number; headers: Record<string, string> };
    return { status: meta.status, headers: meta.headers, body };
  } catch {
    return null;
  }
};

const writeCache = async (url: string, response: CachedResponse) => {
  const { metaPath, bodyPath } = cachePathsFor(url);
  await Promise.all([
    fs.writeFile(metaPath, JSON.stringify({ status: response.status, headers: response.headers })),
    fs.writeFile(bodyPath, response.body),
  ]);
};

const scrubHeaders = (headers: Record<string, string>) => {
  const cleaned = { ...headers };
  delete cleaned["content-encoding"];
  delete cleaned["content-length"];
  return cleaned;
};

export const test = base.extend({
  page: async ({ page }, use) => {
    await ensureCacheDir();
    await page.route("**/*", async (route) => {
      const request = route.request();
      if (request.method() !== "GET") {
        await route.continue();
        return;
      }

      const url = new URL(request.url());
      if (!cacheableHosts.has(url.host)) {
        await route.continue();
        return;
      }

      const cached = await readCache(url.toString());
      if (cached) {
        await route.fulfill({
          status: cached.status,
          headers: cached.headers,
          body: cached.body,
        });
        return;
      }

      const response = await route.fetch();
      const body = await response.body();
      const headers = scrubHeaders(response.headers());
      await writeCache(url.toString(), { status: response.status(), headers, body });

      await route.fulfill({
        status: response.status(),
        headers,
        body,
      });
    });

    await use(page);
  },
});

export { expect };
