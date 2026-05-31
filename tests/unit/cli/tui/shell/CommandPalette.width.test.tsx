/**
 * Task 3.3 — Width-adaptive CommandPalette
 *
 * In 'tiny' mode (<60 cols), CommandPalette renders at width:'100%' and
 * truncates long entry labels with '…'.
 * In 'wide'/'narrow' modes it keeps the fixed 50-col width.
 */
import React from 'react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, cleanup } from 'ink-testing-library';

// Mock useShellWidth at the module level before importing the component
vi.mock('../../../../../src/cli/tui/shell/width.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../../../../src/cli/tui/shell/width.js')>();
  return {
    ...original,
    useShellWidth: vi.fn(() => 'wide' as const),
  };
});

// Mock useStdout so we can simulate a narrow terminal in tiny-mode tests
vi.mock('ink', async (importOriginal) => {
  const original = await importOriginal<typeof import('ink')>();
  return {
    ...original,
    useStdout: vi.fn(() => ({ stdout: { columns: 100 } })),
  };
});

import { CommandPalette } from '../../../../../src/cli/tui/shell/CommandPalette.js';
import { useShellWidth } from '../../../../../src/cli/tui/shell/width.js';
import { useStdout } from 'ink';
import type { PaletteEntry } from '../../../../../src/cli/tui/shell/palette-index.js';

afterEach(() => {
  cleanup();
  vi.mocked(useStdout).mockReturnValue({ stdout: { columns: 100 } } as ReturnType<typeof useStdout>);
});

beforeEach(() => {
  vi.mocked(useShellWidth).mockReturnValue('wide');
  vi.mocked(useStdout).mockReturnValue({ stdout: { columns: 100 } } as ReturnType<typeof useStdout>);
});

const ENTRIES: PaletteEntry[] = [
  { id: 'agents', label: 'Agents', kind: 'category', keywords: ['agents'] },
  { id: 'verify', label: 'Verify', kind: 'action', keywords: ['verify'] },
];

const LONG_ENTRIES: PaletteEntry[] = [
  {
    id: 'llm_key',
    label: 'LLM Provider › API key (very long label that should be truncated in tiny mode)',
    kind: 'field',
    path: 'llm',
    keywords: ['llm', 'api key'],
  },
];

describe('CommandPalette — width-adaptive', () => {
  it('renders normally in wide mode (no truncation)', async () => {
    vi.mocked(useShellWidth).mockReturnValue('wide');
    vi.mocked(useStdout).mockReturnValue({ stdout: { columns: 100 } } as ReturnType<typeof useStdout>);
    const { lastFrame } = render(
      <CommandPalette entries={ENTRIES} onPick={() => {}} onClose={() => {}} />,
    );
    await new Promise((r) => setTimeout(r, 20));
    expect(lastFrame()).toContain('Jump to');
    // 'agents' and 'verify' are in FREQUENTLY_USED so they show without a query
    expect(lastFrame()).toContain('Agents');
  });

  it('truncates long labels with … in tiny mode', async () => {
    vi.mocked(useShellWidth).mockReturnValue('tiny');
    // Simulate a narrow 50-col terminal so maxLabelChars is 50 - 14 = 36
    vi.mocked(useStdout).mockReturnValue({ stdout: { columns: 50 } } as ReturnType<typeof useStdout>);
    const { lastFrame, stdin } = render(
      <CommandPalette entries={LONG_ENTRIES} onPick={() => {}} onClose={() => {}} />,
    );
    await new Promise((r) => setTimeout(r, 20));
    // Type a query to surface the long-label entry
    stdin.write('llm');
    await new Promise((r) => setTimeout(r, 30));
    const frame = lastFrame() ?? '';
    // The full label must NOT appear (it should be truncated in tiny mode)
    expect(frame).not.toContain('very long label that should be truncated');
    // A result row (not the header) must contain '…'
    const resultLines = frame.split('\n').filter(
      (l) => l.includes('LLM') && !l.includes('Jump to'),
    );
    expect(resultLines.length).toBeGreaterThan(0);
    const joined = resultLines.join('\n');
    expect(joined).toContain('…');
  });

  it('does not truncate in wide mode even with long label', async () => {
    vi.mocked(useShellWidth).mockReturnValue('wide');
    const { lastFrame, stdin } = render(
      <CommandPalette entries={LONG_ENTRIES} onPick={() => {}} onClose={() => {}} />,
    );
    await new Promise((r) => setTimeout(r, 20));
    // Type a query to surface the long-label entry
    stdin.write('llm');
    await new Promise((r) => setTimeout(r, 30));
    const frame = lastFrame() ?? '';
    // In wide mode the entry label rows must NOT contain the truncation ellipsis.
    // ('Jump to…' in the header is expected, but result rows should not have it.)
    const resultLines = (frame.split('\n'))
      .filter((l) => l.includes('LLM') && !l.includes('Jump to'));
    expect(resultLines.length).toBeGreaterThan(0);
    // No result line should contain '…' (truncation marker)
    for (const line of resultLines) {
      expect(line).not.toContain('…');
    }
  });
});
