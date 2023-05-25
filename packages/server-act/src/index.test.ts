import {test, expect} from 'vitest';
import z from 'zod';

import {serverAct} from '.';

test('should able to create action without input', async () => {
  const action = serverAct.action(async () => Promise.resolve('bar'));
  await expect(action()).resolves.toBe('bar');
});

test('should able to create action with input', async () => {
  const action = serverAct.input(z.string()).action(async () => Promise.resolve('bar'));
  await expect(action('foo')).resolves.toBe('bar');
});

test('should throw error if the input is invalid', async () => {
  const action = serverAct.input(z.string()).action(async () => Promise.resolve('bar'));
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  await expect(action(1)).rejects.toThrowError();
});
