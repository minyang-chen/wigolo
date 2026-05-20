import type { SearchInput, SearchOutput, StageResult } from '../../types.js';
import type { SearchContext } from '../../providers/search-provider.js';

/**
 * Placeholder for the extracted SearXNG search orchestration body. The full
 * extraction lands in Task 1.2 (next commit). Task 1.1 needs this symbol to
 * exist so `LegacySearxngProvider` can compile and the factory test can
 * verify instance type without invoking the search path.
 */
export async function runSearxngSearch(
  _input: SearchInput,
  _ctx: SearchContext,
): Promise<StageResult<SearchOutput>> {
  throw new Error('searxng-orchestrator not yet extracted; see Task 1.2');
}
