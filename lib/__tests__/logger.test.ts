import { test } from 'node:test';
import assert from 'node:assert';
import { logger } from '../logger.ts';

test('logger exists and has required methods', () => {
  assert.strictEqual(typeof logger.info, 'function');
  assert.strictEqual(typeof logger.warn, 'function');
  assert.strictEqual(typeof logger.error, 'function');
});

test('logger methods can be called', () => {
  // We just want to make sure they don't throw
  logger.info('test info');
  logger.warn('test warn');
  logger.error('test error');
});
