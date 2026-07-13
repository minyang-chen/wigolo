import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resetConfig } from '../../../src/config.js';

vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
  spawn: vi.fn(),
}));

import { execSync } from 'node:child_process';
import {
  DockerSearxng,
  isContainerRunning,
  stopContainer,
  resolveContainerCli,
  __resetResolvedContainerCli,
} from '../../../src/searxng/docker.js';

describe('SearXNG Docker', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    resetConfig();
    vi.clearAllMocks();
    __resetResolvedContainerCli();
  });

  afterEach(() => { process.env = originalEnv; resetConfig(); __resetResolvedContainerCli(); });

  describe('resolveContainerCli', () => {
    it('prefers docker when both docker and podman are available', () => {
      vi.mocked(execSync).mockReturnValue('Docker version 24.0.0' as any);
      expect(resolveContainerCli()).toBe('docker');
      expect(execSync).toHaveBeenCalledTimes(1);
      expect(execSync).toHaveBeenCalledWith('docker --version', expect.anything());
    });

    it('falls back to podman when docker is not found', () => {
      vi.mocked(execSync).mockImplementation((cmd) => {
        if (String(cmd).startsWith('docker')) throw new Error('docker: command not found');
        return 'podman version 4.9.0' as any;
      });
      expect(resolveContainerCli()).toBe('podman');
      expect(execSync).toHaveBeenCalledWith('docker --version', expect.anything());
      expect(execSync).toHaveBeenCalledWith('podman --version', expect.anything());
    });

    it('returns null when neither docker nor podman is found', () => {
      vi.mocked(execSync).mockImplementation(() => { throw new Error('command not found'); });
      expect(resolveContainerCli()).toBeNull();
    });

    it('memoizes the resolved CLI — only probes once across repeated calls', () => {
      vi.mocked(execSync).mockReturnValue('Docker version 24.0.0' as any);
      expect(resolveContainerCli()).toBe('docker');
      expect(resolveContainerCli()).toBe('docker');
      expect(resolveContainerCli()).toBe('docker');
      expect(execSync).toHaveBeenCalledTimes(1);
    });

    it('re-probes after __resetResolvedContainerCli', () => {
      vi.mocked(execSync).mockReturnValue('Docker version 24.0.0' as any);
      expect(resolveContainerCli()).toBe('docker');
      __resetResolvedContainerCli();
      vi.mocked(execSync).mockImplementation(() => { throw new Error('gone'); });
      expect(resolveContainerCli()).toBeNull();
    });
  });

  describe('isContainerRunning', () => {
    it('returns true when container is running (docker)', () => {
      vi.mocked(execSync).mockImplementation((cmd) => {
        if (String(cmd) === 'docker --version') return 'Docker version 24.0.0' as any;
        return 'true\n' as any;
      });
      expect(isContainerRunning('wigolo-searxng')).toBe(true);
      expect(execSync).toHaveBeenCalledWith(expect.stringMatching(/^docker inspect/), expect.anything());
    });

    it('returns true when container is running via podman fallback', () => {
      vi.mocked(execSync).mockImplementation((cmd) => {
        const s = String(cmd);
        if (s.startsWith('docker')) throw new Error('docker: command not found');
        if (s === 'podman --version') return 'podman version 4.9.0' as any;
        return 'true\n' as any;
      });
      expect(isContainerRunning('wigolo-searxng')).toBe(true);
      expect(execSync).toHaveBeenCalledWith(expect.stringMatching(/^podman inspect/), expect.anything());
    });

    it('returns false when container is not running', () => {
      vi.mocked(execSync).mockImplementation((cmd) => {
        if (String(cmd) === 'docker --version') return 'Docker version 24.0.0' as any;
        return '\n' as any;
      });
      expect(isContainerRunning('wigolo-searxng')).toBe(false);
    });

    it('returns false when the docker command fails', () => {
      vi.mocked(execSync).mockImplementation((cmd) => {
        if (String(cmd) === 'docker --version') return 'Docker version 24.0.0' as any;
        throw new Error();
      });
      expect(isContainerRunning('wigolo-searxng')).toBe(false);
    });

    it('returns false when no docker-compatible CLI is found at all', () => {
      vi.mocked(execSync).mockImplementation(() => { throw new Error('not found'); });
      expect(isContainerRunning('wigolo-searxng')).toBe(false);
      // no inspect attempt should have been made — resolution failed first
      expect(execSync).not.toHaveBeenCalledWith(expect.stringContaining('inspect'), expect.anything());
    });
  });

  describe('stopContainer', () => {
    it('runs docker stop and rm when docker is available', () => {
      vi.mocked(execSync).mockReturnValue('Docker version 24.0.0' as any);
      stopContainer('wigolo-searxng');
      expect(execSync).toHaveBeenCalledWith(
        expect.stringMatching(/^docker stop .* && docker rm /),
        expect.anything(),
      );
    });

    it('runs podman stop and rm when only podman is available', () => {
      vi.mocked(execSync).mockImplementation((cmd) => {
        const s = String(cmd);
        if (s.startsWith('docker')) throw new Error('docker: command not found');
        return 'podman version 4.9.0' as any;
      });
      stopContainer('wigolo-searxng');
      expect(execSync).toHaveBeenCalledWith(
        expect.stringMatching(/^podman stop .* && podman rm /),
        expect.anything(),
      );
    });

    it('does nothing when no docker-compatible CLI is found', () => {
      vi.mocked(execSync).mockImplementation(() => { throw new Error('not found'); });
      stopContainer('wigolo-searxng');
      expect(execSync).not.toHaveBeenCalledWith(expect.stringContaining('stop'), expect.anything());
    });
  });

  describe('DockerSearxng.start', () => {
    const originalFetch = global.fetch;
    afterEach(() => { global.fetch = originalFetch; });

    it('returns null immediately when no docker-compatible CLI is found', async () => {
      vi.mocked(execSync).mockImplementation(() => { throw new Error('not found'); });
      const instance = new DockerSearxng();
      const url = await instance.start();
      expect(url).toBeNull();
      expect(execSync).not.toHaveBeenCalledWith(expect.stringContaining('run -d'), expect.anything());
    });

    it('runs the container via podman when docker is unavailable and reports healthy', async () => {
      vi.mocked(execSync).mockImplementation((cmd) => {
        const s = String(cmd);
        if (s.startsWith('docker')) throw new Error('docker: command not found');
        return 'podman version 4.9.0' as any;
      });
      global.fetch = vi.fn().mockResolvedValue({ ok: true }) as any;

      const instance = new DockerSearxng();
      const url = await instance.start();

      expect(url).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);
      expect(execSync).toHaveBeenCalledWith(expect.stringMatching(/^podman run -d/), expect.anything());
    });
  });
});
