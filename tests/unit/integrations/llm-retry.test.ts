import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Test runLlmText's transient-error retry behavior. Bench observation:
// Gemini Flash Lite returned 503 "high demand" on a peak-traffic day, and
// every consumer (search/format=answer, agent, research) silently degraded
// to the heuristic fallback. One bounded retry with backoff would have
// recovered most of those without leaking 503-burst flakes into the bench
// score.

vi.mock('../../../src/integrations/cloud/llm/text-adapters.js', () => ({
  TEXT_ADAPTERS: {
    anthropic: vi.fn(),
    openai: vi.fn(),
    gemini: vi.fn(),
    groq: vi.fn(),
  },
}));

import { TEXT_ADAPTERS } from '../../../src/integrations/cloud/llm/text-adapters.js';
import { runLlmText } from '../../../src/integrations/cloud/llm/run.js';

describe('runLlmText retry on transient errors', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.clearAllMocks();
    process.env.WIGOLO_LLM_PROVIDER = 'gemini';
    process.env.GOOGLE_API_KEY = 'test-key';
  });
  afterEach(() => {
    process.env = originalEnv;
  });

  it('retries on 503 UNAVAILABLE and returns the successful retry result', async () => {
    const adapter = TEXT_ADAPTERS.gemini as ReturnType<typeof vi.fn>;
    let calls = 0;
    adapter.mockImplementation(() => {
      calls += 1;
      if (calls === 1) {
        const err = new Error('[GoogleGenerativeAI Error]: 503 Service Unavailable: The model is overloaded.');
        (err as unknown as Record<string, unknown>).status = 503;
        return Promise.reject(err);
      }
      return Promise.resolve({
        text: 'Recovered on retry',
        provider: 'gemini',
        model: 'gemini-flash-lite',
        latencyMs: 50,
      });
    });

    const result = await runLlmText({ prompt: 'q', maxTokens: 100 });
    expect(result.text).toBe('Recovered on retry');
    expect(calls).toBe(2);
  });

  it('retries on 429 Too Many Requests', async () => {
    const adapter = TEXT_ADAPTERS.gemini as ReturnType<typeof vi.fn>;
    let calls = 0;
    adapter.mockImplementation(() => {
      calls += 1;
      if (calls < 2) return Promise.reject(new Error('429 Too Many Requests: rate limit exceeded'));
      return Promise.resolve({ text: 'ok', provider: 'gemini', model: 'g', latencyMs: 10 });
    });

    const result = await runLlmText({ prompt: 'q' });
    expect(result.text).toBe('ok');
    expect(calls).toBe(2);
  });

  it('does not retry on 4xx auth errors (non-transient)', async () => {
    const adapter = TEXT_ADAPTERS.gemini as ReturnType<typeof vi.fn>;
    const err = new Error('401 Unauthorized: invalid API key');
    (err as unknown as Record<string, unknown>).status = 401;
    adapter.mockRejectedValue(err);

    await expect(runLlmText({ prompt: 'q' })).rejects.toThrow(/401|Unauthorized/);
    expect(adapter).toHaveBeenCalledTimes(1);
  });

  it('gives up after retry budget exhausted', async () => {
    const adapter = TEXT_ADAPTERS.gemini as ReturnType<typeof vi.fn>;
    const err = new Error('503 UNAVAILABLE: model overloaded');
    (err as unknown as Record<string, unknown>).status = 503;
    adapter.mockRejectedValue(err);

    await expect(runLlmText({ prompt: 'q' })).rejects.toThrow(/503|UNAVAILABLE/);
    // Initial call + 2 retries = 3 attempts.
    expect(adapter).toHaveBeenCalledTimes(3);
  });
});
