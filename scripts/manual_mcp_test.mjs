#!/usr/bin/env node
// Manual MCP test harness — exercises every wigolo tool over stdio
// and records latency / output shape for analysis.

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const OUT_DIR = process.env.OUT_DIR || join(process.cwd(), 'tmp', 'manual_mcp_runs');
mkdirSync(OUT_DIR, { recursive: true });

const transport = new StdioClientTransport({
  command: 'node',
  args: [join(process.cwd(), 'dist', 'index.js')],
  env: { ...process.env, NODE_ENV: 'production' },
});

const client = new Client({ name: 'manual-mcp-tester', version: '0.0.1' }, { capabilities: {} });

const t0 = Date.now();
await client.connect(transport);
const connectMs = Date.now() - t0;
console.error(`[connected in ${connectMs}ms]`);

const list = await client.listTools();
console.error(`[tools listed: ${list.tools.map(t => t.name).join(', ')}]`);

const results = [];

async function call(label, name, args, opts = {}) {
  const start = Date.now();
  let res, err;
  try {
    res = await client.callTool({ name, arguments: args }, undefined, { timeout: opts.timeoutMs || 180000 });
  } catch (e) {
    err = String(e?.stack || e?.message || e);
  }
  const ms = Date.now() - start;
  const text = res?.content?.map(c => c.text || '').join('\n') || '';
  const isError = res?.isError === true;
  const summary = {
    label,
    tool: name,
    args,
    ms,
    isError,
    err,
    bytes: text.length,
    preview: text.slice(0, 600),
    contentTypes: res?.content?.map(c => c.type) || [],
  };
  results.push(summary);
  console.error(`[${label}] ${name} ${ms}ms err=${!!err} isError=${isError} bytes=${text.length}`);
  writeFileSync(join(OUT_DIR, `${String(results.length).padStart(2, '0')}_${label}.txt`),
    `# ${label} (${name})\nargs=${JSON.stringify(args)}\nms=${ms}\nisError=${isError}\nerr=${err || ''}\n\n---\n${text}\n`);
  return summary;
}

// 1. Cache stats — baseline
await call('cache_stats', 'cache', { stats: true });

// 2. Search single query (recency-sensitive)
await call('search_single', 'search', {
  query: 'TypeScript 5.5 release notes',
  max_results: 5,
  include_content: true,
  max_content_chars: 1500,
});

// 3. Search multi-query (array) with time_range
await call('search_multi', 'search', {
  query: ['typescript 5.5 features', 'typescript 5.5 changelog'],
  max_results: 6,
  time_range: 'year',
  include_content: false,
});

// 4. Fetch static docs with full markdown
await call('fetch_static', 'fetch', {
  url: 'https://nodejs.org/api/fs.html',
  include_full_markdown: true,
  max_content_chars: 4000,
});

// 5. Fetch JS-rendered SPA-ish page (force render)
await call('fetch_render', 'fetch', {
  url: 'https://hono.dev/',
  render_js: 'auto',
  include_full_markdown: true,
  max_content_chars: 3000,
});

// 6. Extract structured from a GitHub repo page
await call('extract_structured', 'extract', {
  url: 'https://github.com/honojs/hono',
  mode: 'structured',
});

// 7. Crawl small docs site (sitemap)
await call('crawl_sitemap', 'crawl', {
  url: 'https://hono.dev/docs',
  strategy: 'sitemap',
  max_pages: 8,
  max_depth: 2,
}, { timeoutMs: 240000 });

// 8. Find similar after crawl — use concept
await call('find_similar_concept', 'find_similar', {
  concept: 'lightweight TypeScript edge web framework',
  max_results: 8,
});

// 9. Research quick
await call('research_quick', 'research', {
  question: 'What are the main features of the Hono web framework?',
  depth: 'quick',
}, { timeoutMs: 240000 });

// 10. Agent gather
await call('agent_gather', 'agent', {
  prompt: 'List Hono framework core features with one-line explanation per feature.',
  urls: ['https://hono.dev/docs'],
  max_pages: 5,
  max_time_ms: 60000,
}, { timeoutMs: 240000 });

// 11. Cache stats after — should show growth
await call('cache_stats_after', 'cache', { stats: true });

// 12. Cache full-text query against what we just stored
await call('cache_query', 'cache', { query: 'hono router middleware', url_pattern: '*hono.dev*' });

writeFileSync(join(OUT_DIR, '00_summary.json'), JSON.stringify({ connectMs, results }, null, 2));
console.error(`\nDONE. Summary at ${join(OUT_DIR, '00_summary.json')}`);

await client.close();
process.exit(0);
