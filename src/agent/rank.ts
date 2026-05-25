import { classifyIntent } from '../search/core/intent-router.js';
import { domainQualityScore } from '../search/core/domain-quality.js';
import { lexicalAlignment } from '../search/core/lexical-alignment.js';
import type { MergedSearchResult } from '../search/dedup.js';

/**
 * Apply the core ranker's brand-collision multipliers (domain quality
 * + lexical alignment) to the agent's deduped search results. The
 * agent's executor uses an independent path that bypasses the core
 * orchestrator — without this hook, queries like "list top 5 open-source
 * MCP servers with stars, language, last commit" surface brand-domain
 * pages ("Microsoft Lists", "NASA stars") above the real MCP repos.
 */
export function rankAgentSearchResults(
  prompt: string,
  results: MergedSearchResult[],
): MergedSearchResult[] {
  if (!prompt.trim() || results.length === 0) return results;
  const vertical = classifyIntent(prompt);
  return [...results]
    .map((r) => {
      const dq = domainQualityScore(r.url, vertical, prompt);
      const la = lexicalAlignment(prompt, r.title, r.snippet);
      const final = r.relevance_score * dq * (0.5 + 0.5 * la);
      return { ...r, relevance_score: final };
    })
    .sort((a, b) => b.relevance_score - a.relevance_score);
}
