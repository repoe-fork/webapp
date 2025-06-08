import { QueryClient } from "@tanstack/react-query";

export const context = {
  queryClient: new QueryClient(),
};

export type Context = typeof context;
