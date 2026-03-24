import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateEnv } from '../env';

describe('validateEnv', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('throws when GEMINI_API_KEY is missing', () => {
    delete process.env.GEMINI_API_KEY;
    expect(() => validateEnv()).toThrow('GEMINI_API_KEY');
  });

  it('does not throw when all required vars are set', () => {
    process.env.GEMINI_API_KEY = 'test-key';
    expect(() => validateEnv()).not.toThrow();
  });
});
