import React, { useMemo, useState } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import { semantic } from '../theme/palette.js';
import { useShellWidth } from './width.js';
import { type PaletteEntry, fuzzyScore } from './palette-index.js';

const FREQUENTLY_USED: string[] = [
  'WIGOLO_LLM_API_KEY',
  'agents',
  'verify',
  'doctor',
  'export',
];

const MAX_RESULTS = 8;

// Chrome reserved per row: border (2) + padding (2) + glyph (2) + kind label (8) ≈ 14 cols
const TINY_LABEL_CHROME_COLS = 14;

interface CommandPaletteProps {
  entries: PaletteEntry[];
  onPick: (entry: PaletteEntry) => void;
  onClose: () => void;
}

function truncateLabel(label: string, maxLen: number): string {
  if (label.length <= maxLen) return label;
  return label.slice(0, maxLen - 1) + '…';
}

export function CommandPalette({ entries, onPick, onClose }: CommandPaletteProps): React.ReactElement {
  const shellWidth = useShellWidth();
  const { stdout } = useStdout();
  const isTiny = shellWidth === 'tiny';
  // In tiny mode use full terminal width; otherwise keep the fixed 50-col overlay.
  const overlayWidth = isTiny ? '100%' : 50;
  // Reserve 6 chars for borders, padding, selection glyph, and kind label space.
  const maxLabelChars = isTiny ? Math.max(10, stdout.columns - TINY_LABEL_CHROME_COLS) : 44;

  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);

  const filtered = useMemo<PaletteEntry[]>(() => {
    if (!query) {
      const defaults = FREQUENTLY_USED
        .map(id => entries.find(e => e.id === id))
        .filter((e): e is PaletteEntry => e !== undefined);
      return defaults.slice(0, MAX_RESULTS);
    }
    return entries
      .map(e => ({ entry: e, score: fuzzyScore(query, e.label) + fuzzyScore(query, e.keywords.join(' ')) }))
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(x => x.entry)
      .slice(0, MAX_RESULTS);
  }, [query, entries]);

  const clampedCursor = Math.min(cursor, Math.max(0, filtered.length - 1));

  useInput((input, key) => {
    if (key.escape) {
      onClose();
      return;
    }
    if (key.return) {
      const picked = filtered[clampedCursor];
      if (picked) {
        onPick(picked);
      }
      return;
    }
    if (key.upArrow) {
      setCursor(c => Math.max(0, c - 1));
      return;
    }
    if (key.downArrow) {
      setCursor(c => Math.min(filtered.length - 1, c + 1));
      return;
    }
    if (key.backspace || key.delete) {
      setQuery(q => q.slice(0, -1));
      setCursor(0);
      return;
    }
    if (input && !key.ctrl && !key.meta) {
      setQuery(q => q + input);
      setCursor(0);
    }
  }, { isActive: true });

  return (
    <Box
      borderStyle="round"
      borderColor={semantic.accent}
      flexDirection="column"
      paddingX={1}
      width={overlayWidth}
    >
      <Text color={semantic.accent} bold>Jump to…</Text>
      <Box>
        <Text color={semantic.textDim}>{'> '}</Text>
        <Text>{query || ' '}</Text>
      </Box>
      <Box flexDirection="column" marginTop={1}>
        {filtered.length === 0 && (
          <Text color={semantic.textMuted}>No results</Text>
        )}
        {filtered.map((entry, i) => {
          const isSel = i === clampedCursor;
          const kindColor = entry.kind === 'action' ? semantic.accentAlt : entry.kind === 'field' ? semantic.textDim : semantic.ok;
          const displayLabel = isTiny
            ? truncateLabel(entry.label, maxLabelChars)
            : entry.label;
          return (
            <Box key={entry.id} justifyContent="space-between">
              <Text color={isSel ? semantic.text : semantic.textDim} bold={isSel}>
                {isSel ? '▸ ' : '  '}{displayLabel}
              </Text>
              <Text color={kindColor}>{entry.kind}</Text>
            </Box>
          );
        })}
      </Box>
      <Text color={semantic.textMuted}>↑↓ navigate · ⏎ jump · esc close</Text>
    </Box>
  );
}
