import type { SearchProvider } from '../../providers/search-provider.js';

export class V1StubProvider implements SearchProvider {
  readonly name = 'v1' as const;

  async search(): Promise<never> {
    throw new Error(
      'V1 search provider not yet implemented. Use WIGOLO_SEARCH=searxng until Phase 7 lands.',
    );
  }
}
