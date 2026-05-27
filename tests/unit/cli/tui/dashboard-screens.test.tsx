/**
 * Smoke render + delegation tests for SP5 dashboard screens.
 *
 * Why: the dashboard .tsx files must mount without throwing and delegate to
 * the correct action (no business logic in components). These tests mock the
 * actions layer (dynamic-imported inside the components) and getConfig, then
 * assert the screens render and call the right action after their effects fire.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from 'ink-testing-library';

const computeStorageMock = vi.hoisted(() => vi.fn());
const getCacheStatsActionMock = vi.hoisted(() => vi.fn());
const cleanupComponentMock = vi.hoisted(() => vi.fn());
const exportConfigMock = vi.hoisted(() => vi.fn());
const importConfigMock = vi.hoisted(() => vi.fn());
const uninstallMock = vi.hoisted(() => vi.fn());

vi.mock('../../../../src/cli/tui/actions/index.js', () => ({
  computeStorage: computeStorageMock,
  getCacheStatsAction: getCacheStatsActionMock,
  cleanupComponent: cleanupComponentMock,
  exportConfig: exportConfigMock,
  importConfig: importConfigMock,
  uninstall: uninstallMock,
}));

vi.mock('../../../../src/config.js', () => ({
  getConfig: vi.fn(() => ({ dataDir: '/tmp/wigolo-test-datadir' })),
}));

import { Dashboard } from '../../../../src/cli/tui/components/Dashboard.js';
import { DashboardCleanup } from '../../../../src/cli/tui/components/DashboardCleanup.js';
import { DashboardExport } from '../../../../src/cli/tui/components/DashboardExport.js';
import { DashboardUninstall } from '../../../../src/cli/tui/components/DashboardUninstall.js';

/** Wait for useEffect's dynamic import + async action to settle. */
async function flush(): Promise<void> {
  await new Promise((r) => setTimeout(r, 40));
}

beforeEach(() => {
  vi.clearAllMocks();
  computeStorageMock.mockResolvedValue({
    items: [
      { id: 'cache', label: 'Cache DB', path: '/x/wigolo.db', bytes: 1024 },
      { id: 'embeddings', label: 'Embeddings index', path: '/x/embeddings', bytes: 2048 },
      { id: 'models', label: 'ML models', path: '/x/models', bytes: 0 },
      { id: 'browser', label: 'Browser engine', path: '/x/playwright-browsers', bytes: 0 },
      { id: 'searxng', label: 'Search engine data', path: '/x/searxng', bytes: 0 },
    ],
    hogs: [
      { id: 'embeddings', label: 'Embeddings index', path: '/x/embeddings', bytes: 2048 },
      { id: 'cache', label: 'Cache DB', path: '/x/wigolo.db', bytes: 1024 },
    ],
    totalBytes: 3072,
  });
  getCacheStatsActionMock.mockResolvedValue({
    totalEntries: 7, sizeMb: 0.5, oldest: '2025-01-01 00:00:00', newest: '2025-06-01 00:00:00',
  });
});

afterEach(() => {
  cleanup();
});

describe('Dashboard — smoke render + data delegation', () => {
  it('mounts without throwing', () => {
    expect(() =>
      render(<Dashboard onNavigate={() => {}} onBack={() => {}} />),
    ).not.toThrow();
  });

  it('delegates to computeStorage and getCacheStatsAction on mount', async () => {
    render(<Dashboard onNavigate={() => {}} onBack={() => {}} />);
    await flush();
    expect(computeStorageMock).toHaveBeenCalledWith('/tmp/wigolo-test-datadir');
    expect(getCacheStatsActionMock).toHaveBeenCalledOnce();
  });

  it('renders storage hogs and cache stats after load', async () => {
    const { lastFrame } = render(<Dashboard onNavigate={() => {}} onBack={() => {}} />);
    await flush();
    const frame = lastFrame()!;
    expect(frame).toContain('Embeddings index');
    expect(frame).toContain('Cache DB');
    expect(frame).toContain('7 entries');
  });
});

describe('DashboardCleanup — smoke render + cleanup delegation', () => {
  it('mounts without throwing', () => {
    expect(() => render(<DashboardCleanup onBack={() => {}} />)).not.toThrow();
  });

  it('delegates to computeStorage on mount to populate component sizes', async () => {
    render(<DashboardCleanup onBack={() => {}} />);
    await flush();
    expect(computeStorageMock).toHaveBeenCalledWith('/tmp/wigolo-test-datadir');
  });

  it('triggers cleanupComponent when enter is pressed on a component', async () => {
    cleanupComponentMock.mockResolvedValue({ ok: true, freedBytes: 1024 });
    const { stdin } = render(<DashboardCleanup onBack={() => {}} />);
    await flush();
    // First item is 'cache' (CLEANABLE_IDS order); press enter.
    stdin.write('\r');
    await flush();
    expect(cleanupComponentMock).toHaveBeenCalledWith('cache', '/tmp/wigolo-test-datadir');
  });
});

describe('DashboardExport — smoke render + export/import delegation', () => {
  it('mounts without throwing', () => {
    expect(() => render(<DashboardExport onBack={() => {}} />)).not.toThrow();
  });

  it('shows the export and import menu options', () => {
    const { lastFrame } = render(<DashboardExport onBack={() => {}} />);
    const frame = lastFrame()!;
    expect(frame).toContain('Export config');
    expect(frame).toContain('Import config');
  });

  it('triggers exportConfig when the export option is selected', async () => {
    exportConfigMock.mockResolvedValue({ ok: true, path: '/x' });
    const { stdin } = render(<DashboardExport onBack={() => {}} />);
    await flush();
    // First menu item is 'export'; press enter.
    stdin.write('\r');
    await flush();
    expect(exportConfigMock).toHaveBeenCalledOnce();
  });

  it('triggers importConfig when the import option is selected', async () => {
    importConfigMock.mockResolvedValue({ ok: true });
    const { stdin } = render(<DashboardExport onBack={() => {}} />);
    await flush();
    // Move down to 'import', then enter.
    stdin.write('[B'); // down arrow
    await flush();
    stdin.write('\r');
    await flush();
    expect(importConfigMock).toHaveBeenCalledOnce();
  });
});

describe('DashboardUninstall — smoke render + uninstall delegation', () => {
  it('mounts without throwing', () => {
    expect(() => render(<DashboardUninstall onBack={() => {}} />)).not.toThrow();
  });

  it('shows the confirmation prompt and does NOT auto-call uninstall', async () => {
    const { lastFrame } = render(<DashboardUninstall onBack={() => {}} />);
    await flush();
    const frame = lastFrame()!;
    expect(frame.toLowerCase()).toContain('uninstall');
    // No action until the user confirms.
    expect(uninstallMock).not.toHaveBeenCalled();
  });

  it('calls uninstall with confirmed:true only after the user types y', async () => {
    uninstallMock.mockResolvedValue({ ok: true, dataDirRemoved: true, agentResults: [] });
    const { stdin } = render(<DashboardUninstall onBack={() => {}} />);
    await flush();
    stdin.write('y');
    await flush();
    expect(uninstallMock).toHaveBeenCalledWith({
      dataDir: '/tmp/wigolo-test-datadir',
      confirmed: true,
    });
  });

  it('does NOT call uninstall when the user cancels with n', async () => {
    const onBack = vi.fn();
    const { stdin } = render(<DashboardUninstall onBack={onBack} />);
    await flush();
    stdin.write('n');
    await flush();
    expect(uninstallMock).not.toHaveBeenCalled();
    expect(onBack).toHaveBeenCalledOnce();
  });
});
