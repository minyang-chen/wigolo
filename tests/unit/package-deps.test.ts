import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const pkg = JSON.parse(
  readFileSync(join(__dirname, '..', '..', 'package.json'), 'utf-8'),
) as {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  overrides?: Record<string, string>;
};

describe('package.json: forbidden deps after Python-rerank migration', () => {
  // onnxruntime-node is intentionally allowed: fastembed (still the local
  // embedding backend) pulls it transitively and the v0.1.11 bench surfaced
  // npx consumers missing it when not hoisted to wigolo's own dependencies.
  // The other ONNX deps were banned because the rerank stack moved to Python.
  const FORBIDDEN = ['@xenova/transformers', 'onnx-proto', 'onnxruntime-web'];

  for (const name of FORBIDDEN) {
    it(`dependencies does not include ${name}`, () => {
      expect(pkg.dependencies?.[name]).toBeUndefined();
    });
    it(`devDependencies does not include ${name}`, () => {
      expect(pkg.devDependencies?.[name]).toBeUndefined();
    });
  }

  it('overrides.protobufjs is absent', () => {
    expect(pkg.overrides?.protobufjs).toBeUndefined();
  });

  it('engines.node is still >=20', () => {
    const node = (pkg as { engines?: { node?: string } }).engines?.node;
    expect(node).toBeDefined();
    expect(node).toMatch(/>=20/);
  });
});
