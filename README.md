# wigolo

[![npm](https://img.shields.io/npm/v/@staticn0va/wigolo.svg)](https://www.npmjs.com/package/@staticn0va/wigolo)
[![node](https://img.shields.io/badge/node-%E2%89%A520-brightgreen.svg)](https://nodejs.org)
[![license](https://img.shields.io/badge/license-PolyForm--Noncommercial--1.0.0-blue.svg)](#license)

**Local-first web intelligence for AI coding agents.** wigolo runs on your machine as an MCP server and gives an agent one durable surface for everything web-related: search, fetch, crawl, extract, cache, find-similar, research, and autonomous gather workflows. No API keys to start. Nothing routes through a cloud control plane. Every byte it fetches stays in `~/.wigolo/`.

The point of the project is simple: web search and research for agents should be as good as the commercial services — and stay open, local, and free — instead of being a metered API you rent. That's the bar it's measured against.

```bash
# wire it into Claude Code (and pre-warm so the first call isn't cold)
npx @staticn0va/wigolo init --agents=claude-code
npx @staticn0va/wigolo warmup --all
```

---

## Why it exists

Most agent search today is a hosted API. You send a query out, you pay per call, your traffic goes through someone else's index, and your costs scale with how chatty your agent gets — which, with modern autonomous agents, is a lot.

wigolo takes the other path. It's a process you run, not a service you rent:

- **Zero keys to start.** The default search backend talks to public engines through direct adapters. The reranker and embeddings run on-device. You can be useful within a minute of installing.
- **Local-first, private by default.** Cache, embeddings, models, and config live under `~/.wigolo/`. No telemetry unless you turn it on. Optional LLM keys are strictly additive — they unlock answer synthesis and structured extraction, they're never required.
- **Built for agents, not humans.** Ten MCP tools, parallel multi-query fan-out, transparent per-result scoring, and budget-aware output sizing. The fan-out matters: an agent can fire `["a", "b", "c"]` as one call and wigolo runs them across engines in parallel, which a serial host tool-loop can't replicate.
- **Honest output.** Tool results flag stale cache, failed fetches, truncated diffs, schema fallback warnings, and degraded backends instead of returning empty data that looks fine.

It is not a hosted SaaS, not a vector database you query from other apps, and not a general web-automation framework. It does one job: feed agents good web data, locally.

---

## Install & setup

You need **Node ≥ 20** and about **1.5 GB** of free disk (Playwright Chromium, the cross-encoder reranker, the embedding model, and a SQLite cache that grows with use). macOS, Linux, and Windows all work. Python is only needed if you opt into the legacy SearXNG backend.

### First run

```bash
npx @staticn0va/wigolo init
```

This launches a short wizard: system check, optional LLM provider, and agent selection. It writes the MCP server entry into each tool you pick — Claude Code, Cursor, VS Code, Zed, Gemini CLI, Windsurf, Codex, OpenCode — and for Claude Code it also installs skill files and a slash command. Re-running it is idempotent.

Non-interactive (CI / scripted):

```bash
npx @staticn0va/wigolo init --non-interactive --agents=claude-code,cursor --skip-verify
```

### Pre-warm and sanity-check

```bash
npx @staticn0va/wigolo warmup --all   # downloads browser + reranker + embeddings, then verifies
npx @staticn0va/wigolo doctor         # cold-start health check, no network fetches
```

### Add to an MCP client manually

```bash
claude mcp add wigolo -- npx @staticn0va/wigolo
```

That's the whole loop. Restart your agent and wigolo's tools show up in `tools/list` with the cache and browser pool warm.

### Try it without an agent

```bash
wigolo shell                          # interactive REPL
wigolo> search "rate limiter token bucket typescript" --category=code --limit=15
wigolo> fetch https://docs.python.org/3/library/functools.html --section=lru_cache
wigolo> research "Compare Bun, Deno, Node.js for HTTP servers" --depth=standard
```

---

## The tools

| Tool | What it does |
|------|--------------|
| `search` | Multi-engine web search (18 direct engine adapters) with reciprocal-rank fusion, ML cross-encoder reranking, and an explainable per-result score. Accepts a query array for parallel breadth. |
| `fetch` | Load one URL through a tiered router (HTTP → TLS-impersonation → headless browser) that auto-escalates on anti-bot challenges or SPA shells. Returns clean markdown + metadata + links. |
| `crawl` | Multi-page crawl: BFS, DFS, sitemap, auto, or map-only. Per-domain rate limits, robots.txt respect, boilerplate dedup. |
| `extract` | Structured data out of a page: tables, metadata, JSON-LD, brand identity, named schemas (Article/Recipe/Product/…), or any custom JSON Schema. |
| `cache` | Query everything already seen — keyword (FTS5/BM25) or hybrid (BM25 + on-device vector search, fused). Plus stats, clear, and change detection. |
| `find_similar` | Pages similar to a URL or a concept, via 3-way fusion of keyword + semantic + live web. |
| `research` | Decompose a question into sub-queries, fan them out, fetch sources, and synthesize a cited report (or emit a structured brief the host LLM can write from). |
| `agent` | Autonomous gather loop: plan → search → fetch → extract → synthesize, with a step log, time budget, and optional output schema. |
| `diff` / `watch` | Content change detection and URL polling (reserved; shipping incrementally). |

Full per-tool reference, schemas, and recipes live in [`docs/`](docs/).

---

## How it's built

wigolo is a single Node process speaking MCP (JSON-RPC over stdio). Everything heavy is local and lazy-loaded, so a zero-key install pays nothing for the parts it isn't using.

```
  AI coding agent (Claude Code, Cursor, Zed, …)
        │  MCP over stdio
        ▼
  wigolo  ──  10 tools, dynamic instructions, in-process browser pool + cache + models
        │
        ├── SQLite (wigolo.db): url cache, FTS5 keyword index, sqlite-vec embeddings
        ├── Fetch router: HTTP → TLS impersonation → headless browser, with per-domain learning
        ├── Search: 18 engine adapters → RRF fusion → cross-encoder rerank → evidence score
        ├── Embeddings (BGE-small, 384-dim) + cross-encoder reranker, both on-device ONNX
        └── Optional: SearXNG (opt-in), cloud LLM (opt-in, synthesis only)
```

A few design choices worth calling out, because they shape how it behaves:

- **Code beats model.** Deterministic work — URL canonicalization, rank fusion, dedup, schema matching, hashing — never goes to an LLM. The model is reserved for judgment calls (synthesis, filling missing schema fields when the DOM can't), and even then it's opt-in and capped per request. When an LLM does fill a field, the value is checked against the source text and nulled if it can't be found, so hallucinations don't leak into structured output.
- **Smart routing on observable signals.** The fetch tier ladder escalates from plain HTTP to a real browser based on what it actually sees — SPA shell markers, anti-bot challenge bodies, thin content — not guesses about which domains are "probably JS-heavy." It learns per-domain over time and unlearns when a site stops needing the browser.
- **Transparent ranking.** Every search result carries a score breakdown (relevance × domain quality × lexical alignment × recency, plus consensus and authority boosts) and a query-understanding block. You can audit why something ranked where it did.
- **No silent failure.** Stale cache, failed fetches, degraded backends, and truncated output are surfaced in the result, not hidden behind empty-but-successful-looking data.

If you want the deep version — the tier ladder, the extraction ensemble, the storage schema and migrations, the research/agent pipelines, the security model — it's all written up file-by-file in [`docs/`](docs/).

---

## Getting better results

A clean install works. But a few settings meaningfully change output quality, and they're worth knowing about. Set them as environment variables (or in your agent's MCP `env` block).

### Close the synthesis gap (the single biggest lever)

The hosts most people use — Claude Code, Claude Desktop — don't expose MCP sampling, so `research`, `agent`, and `search format=answer` fall back to a heuristic source listing unless you point wigolo at an LLM. Setting one fixes that:

```bash
# Local — keeps everything on your machine, no cloud, no cost:
export WIGOLO_LLM_PROVIDER=http://localhost:11434   # Ollama / vLLM / LM Studio

# or cloud — better-written synthesis, one cheap call per report:
export WIGOLO_LLM_PROVIDER=anthropic                # key goes in the OS keychain, never config.json
```

For synthesizing already-retrieved evidence, a local 7–8B model is plenty. Reach for cloud only when you're producing a report you'll actually ship.

### Widen the retrieval funnel

Search quality is bounded by what the engines surface, so the highest-impact move is giving them more to surface:

```bash
export WIGOLO_SEARCH=hybrid       # core engines + SearXNG fallback on the cases core alone misses
export BRAVE_API_KEY=...          # adds Brave to the pool; better fusion consensus
export WIGOLO_GITHUB_TOKEN=...    # GitHub code search 10 → 30 req/min, plus org-private results
```

`hybrid` needs the (optional) SearXNG bootstrap. If you'd rather not run it, stay on `core` — the Brave and GitHub keys still buy you recall for free.

### Land more fetches, keep things warm

```bash
export WIGOLO_TLS_TIER=auto       # per-domain TLS-impersonation; bypasses Cloudflare/DataDome without paying the cost on sites that don't need it
export WIGOLO_EAGER_WARMUP=1      # pays the ~1s ONNX load up front instead of on first search
```

For repeated interactive use, run `wigolo serve` so the browser pool, embeddings, and reranker stay resident across calls instead of cold-starting each session.

### Per-call habits that pay off

- Use **query arrays** (`["a", "b", "c"]`) for breadth — that's the parallel fan-out a serial host loop can't match.
- Use **`search_depth: "deep"`** for queries that matter (it adds evidence extraction + cross-encoder rerank on highlights); `balanced` is the everyday default.
- Use **`include_domains`** to scope library/docs lookups — it's a hard filter, not a hint.
- To warm `find_similar`, crawl a corpus first with **`WIGOLO_CRAWL_INDEX=1`**, then run `wigolo backfill` to mop up.

If keeping everything on-device is the whole point for you, the honest minimal set is just a local LLM endpoint + `WIGOLO_TLS_TIER=auto` + `WIGOLO_EAGER_WARMUP=1`. That stays fully local and still fixes the synthesis path.

The complete environment-variable catalog is in [`docs/02-configuration.md`](docs/02-configuration.md).

---

## How it compares

There's a healthy field of agent-search tools now. They're good — this table isn't a takedown, it's an honest map of where wigolo's tradeoffs land. The short version: the hosted services win on scale (global neural indexes, anti-bot infrastructure, zero-ops); wigolo wins on locality, privacy, and marginal cost.

| | wigolo | Tavily | Exa | Firecrawl | Perplexity Sonar | Brave Search API | Crawl4AI |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Runs on your machine | ✅ (just `npx`) | ❌ hosted | ❌ hosted | ⚠️ self-host needs Docker+DB | ❌ hosted | ❌ hosted | ✅ |
| Works with no API key | ✅ | ❌ | ❌ | ⚠️ self-host only | ❌ | ❌ | ✅ |
| Source-available | ✅ PolyForm-NC | ❌ | ❌ | ✅ AGPL-3.0 | ❌ | ❌ | ✅ Apache-2.0 |
| Multi-engine search | ✅ 18 engines | ✅ | ✅ neural | ✅ | ✅ grounded | ✅ own index | ❌ |
| Crawl | ✅ | ⚠️ | ⚠️ | ✅ core strength | ❌ | ❌ | ✅ core strength |
| Structured extraction | ✅ | ✅ | ✅ | ✅ | ❌ | ⚠️ | ✅ |
| Find-similar / semantic | ✅ local | ❌ | ✅ signature feature | ❌ | ❌ | ❌ | ❌ |
| Synthesized answers | ✅ (opt-in LLM) | ✅ | ✅ | ✅ (agent endpoint) | ✅ its whole job | ❌ | ❌ |
| Data stays on your machine | ✅ | ❌ | ❌ | ⚠️ self-host only | ❌ | ❌ | ✅ |
| Marginal cost per query | $0 | ~$0.008 after 1k free/mo | ~$49/mo after $10 credit | self-host free / $19+/mo cloud | per-request + per-token | ~$5/mo after credit | $0 |

*Pricing shifts — verify current numbers with each provider. Notable recent changes: Tavily was acquired by Nebius (Feb 2026), and Brave Search API retired its perpetual free tier (Feb 2026). Most of these now ship an MCP server too, but for the hosted ones your queries and fetched content still travel to their cloud — that's the line the "data stays on your machine" row is really drawing.*

Where the others are clearly ahead, and wigolo isn't pretending otherwise:

- **Exa** owns semantic discovery. Its neural index spans hundreds of millions of pages and `find-similar` is its signature. wigolo's `find_similar` works over your local cache + live web, which is great once warmed but won't match a global embeddings index cold.
- **Firecrawl** has a maintained anti-bot layer and managed scale that no self-hosted setup replicates. If you're crawling hostile sites at volume, that's worth paying for.
- **Perplexity Sonar** returns a finished, cited answer in one call. If that's all you need, it's the shortest path.

Where wigolo is the better fit: privacy-sensitive or cost-sensitive work, technical research, repeated queries (the local cache makes re-querying free), and agents that benefit from parallel multi-query fan-out — without a metered bill that grows with how much your agent thinks.

---

## Contributing

Bug reports, feature requests, PRs, and ideas are all genuinely welcome — this is the kind of project that gets better with more eyes on it.

- **Found a bug or want a feature?** [Open an issue](https://github.com/KnockOutEZ/wigolo/issues).
- **Sending a PR?** Go for it. Keep tool handlers thin (business logic lives in the domain modules), run the test suite, and follow the existing conventions; the repo's contributor notes cover the specifics.
- **Want to extend it?** wigolo has a plugin system for custom extractors and search engines — `wigolo plugin add <git-url>`. See [`docs/27-subsystem-daemon-plugins.md`](docs/27-subsystem-daemon-plugins.md).

If something's unclear, ask in an issue. No contribution is too small.

---

## Support the project

wigolo is open and free, and I want to keep it that way — maintained, not abandoned, and not turned into a paywalled API. If it saves you money or a metered search bill, consider chipping in so the maintenance time stays sustainable:

☕ **[Buy me a coffee](https://buymeacoffee.com/knockoutez)**

Sponsorship of any size helps. So does a star, a bug report, or a good PR.

---

## License

Source-available under **PolyForm Noncommercial 1.0.0**. You're free to use, modify, and self-host it for any noncommercial purpose. If you want to use wigolo commercially, or you have any question or concern about the license, please reach out — I'm happy to talk it through.

## Contact

For licensing questions, commercial use, concerns about the project, or anything that doesn't fit in a GitHub issue:

📧 **ktowhid20@gmail.com**

---

<sub>Built and maintained by [@KnockOutEZ](https://github.com/KnockOutEZ). If wigolo is useful to you, the best thanks is a star, an issue, or a coffee.</sub>