# Agent Guide

## Project overview

- This is a single-page app served from GitHub Pages.
- The app provides helpful utilities to explore Path of Exile data exported by the RePoE data mine.
- Advanced functionality for technical users is prioritized, but features should remain approachable for less-technical
  users when possible.

## Data source

- The core data comes from RePoE's exported JSON datasets (the RePoE data mine).
- Treat the data as external, versioned content that can change format over time.

## UI stack

- Styling uses Tailwind CSS with shadcn components.
- Prefer composing shadcn primitives over custom one-off UI widgets.

## Routing and state

- Routing uses the `use-navigation-api` library, with navigation state such as the current page or active tab stored as
  query parameters (this avoids needing to handle arbitrary paths as a static gh-pages site).
- Store state in the URL only when it makes sense as navigation history or for shareable links.
- Keep transient UI state out of the URL.

## UX and information design

- Aim for high information density at first glance.
- Provide clear paths to drill into more detailed views of specific elements.
- Favor layouts that let power users scan and cross-reference quickly, while keeping basics discoverable.

## Playwright Testing

A Playwright E2E testing setup is available to quickly verify changes.

### Running Tests
- `npm run e2e`: Run all E2E tests.
- `npm run e2e -- tests/e2e/some_test.spec.ts`: Run a specific test.
- `npm run e2e:ui`: Open the Playwright UI to interactively run and debug tests.

### Network Caching
To speed up tests and avoid being blocked by rate limits or connectivity issues with external data sources (`ggpk.exposed`, etc.), a caching fixture is provided in `tests/e2e/fixtures.ts`.
- It caches GET requests to known data hosts in the `.playwright-cache` directory.
- When writing new tests, import `test` and `expect` from `./fixtures` instead of `@playwright/test`.

### Verification Tips
When testing pages with dynamic content (like rooms and tiles), use:
```typescript
await page.waitForLoadState("networkidle");
// Sometimes an extra timeout is helpful for images to settle
await page.waitForTimeout(2000); 
```
to ensure all data and assets have been fetched before making assertions.
