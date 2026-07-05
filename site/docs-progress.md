# Content Swap: Warp → wigolo — DONE

## Status: complete. All 13 sections swapped to wigolo content. Warp copy/branding removed. Prod build clean. Live http://localhost:4321.

## Decision: content-only. KEEP Warp's light/purple layout, theme, fonts, animations. Swap copy + assets + branding text only.
Testimonials → "Parity receipts" (real wigolo benchmark findings, no fake people).
Assets in site/public/wigolo/ (wigolo-demo.mp4/.webm/-poster, wigolo-vs.*, wigolo-icon.png, wordmark-light/dark).

## Section swap checklist
| # | Component | Swap | Status |
|---|-----------|------|--------|
| 1 | layout.tsx | title/desc/favicon → wigolo | [ ] |
| 2 | AnnouncementBar | keyless-web + Star GitHub | [ ] |
| 3 | Nav | wigolo wordmark, Tools/Parity/How/Docs/Pricing, GitHub★, npm, `npx wigolo init` | [ ] |
| 4 | Hero | "The web, wired into your local agent." + lede + npx pill; mockup → wigolo-demo.mp4 in window | [ ] |
| 5 | FeatureMarquee | NO API KEYS • RUNS LOCAL • $0/QUERY • 18 ENGINES • VECTOR CACHE • OPEN SOURCE | [ ] |
| 6 | Stats | $0 per query / 0 API keys / 10 tools | [ ] |
| 7 | TrustedBy | agent marquee: claude code·cursor·codex·gemini cli·vs code·windsurf·zed | [ ] |
| 8 | WhyWarp | tabs: Search & Evidence / Smart Fetch / Local Cache / Research & Agent; panels → wigolo code visuals | [ ] |
| 9 | OpenSource | "wigolo is open source" / AGPL-3.0 copy / Star + Read more; bg → wigolo-vs.mp4 | [ ] |
| 10 | Testimonials | Parity receipts rotator (verbatim excerpts / score decomp / live telemetry / self-flagged junk) | [ ] |
| 11 | StartShipping | "Give your agent the whole web." + install; img → wigolo-demo-poster.png | [ ] |
| 12 | GetWarp | 3 cross-platform cols, each `npx wigolo init` (Node ≥20); corner → Read the docs | [ ] |
| 13 | Footer | real wigolo links (GitHub/npm/Docs/Contributing/Security/Trademark/Issues/License) | [ ] |

## Source of truth for copy
Backup landing page: scratchpad/site-backup-*/index.html (exact wigolo taglines/tool copy/parity/quickstart).
10 tools: search, fetch, crawl, cache, extract, find_similar, research, agent, diff, watch.
Repo: github.com/KnockOutEZ/wigolo · npm: wigolo · AGPL-3.0 · @KnockOutEZ
