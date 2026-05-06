import { describe, it, expect } from 'vitest';
import { isValidCandidateUrl, isBlocklistedDomain } from '../../../src/agent/relevance.js';

describe('isValidCandidateUrl', () => {
  it('rejects unparseable URLs', () => {
    expect(isValidCandidateUrl('not a url')).toBe(false);
  });
  it('rejects DuckDuckGo redirect endpoints', () => {
    expect(isValidCandidateUrl('https://duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com')).toBe(false);
  });
  it('accepts ordinary http/https URLs', () => {
    expect(isValidCandidateUrl('https://example.com/a/b')).toBe(true);
  });
});

describe('isBlocklistedDomain', () => {
  it('blocks gaming forums', () => {
    expect(isBlocklistedDomain('https://elitepvpers.com/x')).toBe(true);
  });
  it('blocks Chinese consumer forums for technical queries', () => {
    expect(isBlocklistedDomain('https://zhidao.baidu.com/q')).toBe(true);
    expect(isBlocklistedDomain('https://jingyan.baidu.com/q')).toBe(true);
    expect(isBlocklistedDomain('https://zhihu.com/q')).toBe(true);
  });
  it('does not block reputable domains', () => {
    expect(isBlocklistedDomain('https://postgresql.org/docs')).toBe(false);
    expect(isBlocklistedDomain('https://stackoverflow.com/q/1')).toBe(false);
  });
});
