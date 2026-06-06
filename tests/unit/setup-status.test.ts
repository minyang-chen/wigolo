import { describe, it, expect } from 'vitest';
import { summarizeSetup, probeSetupStatus, type ComponentStatus } from '../../src/cli/tui/actions/setup-status.js';

const base: ComponentStatus[] = [
  { id: 'browser', label: 'browser', required: true, status: 'ok' },
  { id: 'agents', label: 'agents(claude-code)', required: true, status: 'ok' },
  { id: 'search', label: 'search(core)', required: false, status: 'ok' },
  { id: 'embeddings', label: 'embeddings', required: false, status: 'ok', disables: 'find_similar' },
  { id: 'llm', label: 'LLM key', required: false, status: 'ok', disables: 'research/agent' },
];

describe('summarizeSetup', () => {
  it('all ok → exit 0, ready == total', () => {
    const s = summarizeSetup(base);
    expect(s.requiredFailed).toBe(false);
    expect(s.exitCode).toBe(0);
    expect(s.readyCount).toBe(5);
    expect(s.total).toBe(5);
  });

  it('optional embeddings failed → exit 0, names the degradation', () => {
    const s = summarizeSetup(base.map(c => c.id === 'embeddings' ? { ...c, status: 'failed', detail: 'timeout' } : c));
    expect(s.requiredFailed).toBe(false);
    expect(s.exitCode).toBe(0);
    expect(s.lines.join('\n')).toContain('find_similar disabled');
  });

  it('required browser failed → exit 1', () => {
    const s = summarizeSetup(base.map(c => c.id === 'browser' ? { ...c, status: 'failed', detail: 'install failed' } : c));
    expect(s.requiredFailed).toBe(true);
    expect(s.exitCode).toBe(1);
  });

  it('absent optional LLM key renders ⚠ + optional note, not a failure', () => {
    const s = summarizeSetup(base.map(c => c.id === 'llm' ? { ...c, status: 'absent' } : c));
    expect(s.exitCode).toBe(0);
    expect(s.lines.join('\n')).toMatch(/LLM key/);
  });
});

describe('probeSetupStatus', () => {
  const deps = {
    browserInstalled: () => true,
    searchBackend: () => 'core' as const,
    searxngReady: () => false,
    embeddingsInstalled: () => true,
    rerankerInstalled: () => true,
    llmKeyPresent: () => false,
    configuredAgents: () => ['claude-code'],
  };

  it('core backend → search reported ok even when searxng not ready', async () => {
    const comps = await probeSetupStatus(deps);
    const search = comps.find(c => c.id === 'search')!;
    expect(search.status).toBe('ok');
    expect(search.label).toContain('core');
  });

  it('missing browser → required browser failed', async () => {
    const comps = await probeSetupStatus({ ...deps, browserInstalled: () => false });
    const b = comps.find(c => c.id === 'browser')!;
    expect(b.required).toBe(true);
    expect(b.status).toBe('failed');
  });

  it('no LLM key → llm absent + optional', async () => {
    const comps = await probeSetupStatus(deps);
    const llm = comps.find(c => c.id === 'llm')!;
    expect(llm.required).toBe(false);
    expect(llm.status).toBe('absent');
  });

  it('searxng backend but not ready → search degraded (not failed)', async () => {
    const comps = await probeSetupStatus({ ...deps, searchBackend: () => 'searxng' });
    const search = comps.find(c => c.id === 'search')!;
    expect(search.status).toBe('degraded');
    expect(search.required).toBe(false);
  });
});
