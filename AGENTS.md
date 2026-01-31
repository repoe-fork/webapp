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
