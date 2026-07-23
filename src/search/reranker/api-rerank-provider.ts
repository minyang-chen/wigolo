import type {
  RerankProvider,
  RerankCandidate,
  RerankResult,
} from '../../providers/rerank-provider.js';
import { createLogger } from '../../logger.js';

const log = createLogger('reranker');

// Reranker via llm_service API (port 8000).
// Offloads reranking to GPU servers via llm_service round-robin across
// LLAMACPP_RERANK_SERVERS — same load-balancing as chat + embedding.
// Replaces in-process ONNX Transformers.js reranker (CPU, slower).
//
// llm_service /v1/rerank response: { results: [{ index, relevance_score }] }

const DEFAULT_BASE_URL = 'http://172.17.0.1:8000';
const DEFAULT_MODEL    = 'ms-marco-MiniLM-L-6-v2';

export class ApiRerankProvider implements RerankProvider {
  readonly modelId: string;
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor() {
    this.baseUrl = (process.env.WIGOLO_RERANK_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/$/, '');
    this.modelId = process.env.WIGOLO_RERANK_MODEL ?? DEFAULT_MODEL;
    this.apiKey  = process.env.OPENAI_API_KEY ?? 'mclab-llm-key';
  }

  async warmup(): Promise<void> {
    try {
      await this._call('warmup', [{ id: '0', text: 'warmup probe' }]);
      log.info('API rerank provider ready', { baseUrl: this.baseUrl, model: this.modelId });
    } catch (err) {
      log.warn('API rerank warmup failed — will retry on first use', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  async rerank(
    query: string,
    candidates: RerankCandidate[],
    topK = candidates.length,
  ): Promise<RerankResult[]> {
    if (candidates.length === 0) return [];
    return this._call(query, candidates, topK);
  }

  private async _call(
    query: string,
    candidates: RerankCandidate[],
    topK?: number,
  ): Promise<RerankResult[]> {
    const body: Record<string, unknown> = {
      model:     this.modelId,
      query,
      documents: candidates.map((c) => c.text),
    };
    if (topK !== undefined) body.top_n = topK;

    const res = await fetch(`${this.baseUrl}/v1/rerank`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`API rerank HTTP ${res.status}: ${text.slice(0, 200)}`);
    }

    const data = (await res.json()) as {
      results?: Array<{ index: number; relevance_score: number }>;
    };

    return (data.results ?? [])
      .map((r) => ({
        id:    candidates[r.index]?.id ?? String(r.index),
        score: r.relevance_score,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK ?? undefined);
  }

  async dispose(): Promise<void> {
    // Stateless API — nothing to clean up
  }
}
