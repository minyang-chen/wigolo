/**
 * Task 3.3 — Width-adaptive HelpOverlay
 *
 * In 'tiny' mode HelpOverlay renders at width:'100%' instead of fixed 46 cols.
 */
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup } from 'ink-testing-library';

vi.mock('../../../../../src/cli/tui/shell/width.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../../../../src/cli/tui/shell/width.js')>();
  return {
    ...original,
    useShellWidth: vi.fn(() => 'wide' as const),
  };
});

import { HelpOverlay } from '../../../../../src/cli/tui/shell/HelpOverlay.js';
import { useShellWidth } from '../../../../../src/cli/tui/shell/width.js';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('HelpOverlay — width-adaptive', () => {
  it('renders all keybinds in wide mode', async () => {
    vi.mocked(useShellWidth).mockReturnValue('wide');
    const { lastFrame } = render(<HelpOverlay onClose={() => {}} />);
    await new Promise((r) => setTimeout(r, 20));
    const frame = lastFrame() ?? '';
    expect(frame).toContain('↑↓');
    expect(frame).toContain('Tab');
    expect(frame).toContain('esc');
  });

  it('renders all keybinds in tiny mode (no content loss)', async () => {
    vi.mocked(useShellWidth).mockReturnValue('tiny');
    const { lastFrame } = render(<HelpOverlay onClose={() => {}} />);
    await new Promise((r) => setTimeout(r, 20));
    const frame = lastFrame() ?? '';
    // In tiny mode all keybinds still render
    expect(frame).toContain('↑↓');
    expect(frame).toContain('Tab');
    expect(frame).toContain('esc');
    expect(frame).toContain('Keyboard');
  });

  it('calls onClose on Esc in tiny mode', async () => {
    vi.mocked(useShellWidth).mockReturnValue('tiny');
    const onClose = vi.fn();
    const { stdin } = render(<HelpOverlay onClose={onClose} />);
    await new Promise((r) => setTimeout(r, 20));
    stdin.write('\x1b');
    await new Promise((r) => setTimeout(r, 30));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
