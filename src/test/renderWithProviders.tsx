import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions } from '@testing-library/react';
import {
  createMemoryRouter,
  RouterProvider,
  type InitialEntry,
  type RouteObject,
} from 'react-router';
import type { ReactElement } from 'react';

export const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  initialEntries?: InitialEntry[];
  initialIndex?: number;
  routePath?: string;
  additionalRoutes?: RouteObject[];
  queryClient?: QueryClient;
}

export const renderWithProviders = (
  ui: ReactElement,
  {
    initialEntries = ['/'],
    initialIndex,
    routePath = '*',
    additionalRoutes = [],
    queryClient = createTestQueryClient(),
    ...renderOptions
  }: RenderWithProvidersOptions = {},
) => {
  const router = createMemoryRouter(
    [{ path: routePath, element: ui }, ...additionalRoutes],
    { initialEntries, initialIndex },
  );

  const result = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
    renderOptions,
  );

  return { ...result, queryClient, router };
};
