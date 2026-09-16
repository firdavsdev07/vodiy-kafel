import { useMatches } from 'react-router';

export interface RouteHandle {
  title?: string;
}

/** Eng ichki marshrutning `handle.title` i. */
export function usePageTitle(): string | undefined {
  const matches = useMatches();
  for (let i = matches.length - 1; i >= 0; i--) {
    const title = (matches[i]?.handle as RouteHandle | undefined)?.title;
    if (title) return title;
  }
  return undefined;
}
