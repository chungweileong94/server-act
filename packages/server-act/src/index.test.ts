import {test, expect, expectTypeOf, vi, beforeEach, describe} from 'vitest';
import z from 'zod';

import {serverAct} from '.';

test('should able to create action without input', async () => {
  const action = serverAct.action(async () => Promise.resolve('bar'));

  expectTypeOf(action).parameter(0).toBeUndefined();
  expectTypeOf(action).returns.resolves.toBeString();
  await expect(action()).resolves.toBe('bar');
});

test('should able to create action with input', async () => {
  const action = serverAct.input(z.string()).action(async () => Promise.resolve('bar'));

  expectTypeOf(action).parameter(0).toBeString();
  expectTypeOf(action).returns.resolves.toBeString();
  await expect(action('foo')).resolves.toBe('bar');
});

test('should throw error if the input is invalid', async () => {
  const action = serverAct.input(z.string()).action(async () => Promise.resolve('bar'));

  expectTypeOf(action).parameter(0).toBeString();
  expectTypeOf(action).returns.resolves.toBeString();

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  await expect(action(1)).rejects.toThrowError();
});

describe('middleware should be called once', () => {
  const middlewareSpy = vi.fn(() => {
    return {prefix: 'best'};
  });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  test('without input', async () => {
    const action = serverAct.middleware(middlewareSpy).action(async ({ctx}) => Promise.resolve(`${ctx.prefix}-bar`));

    expectTypeOf(action).returns.resolves.toBeString();
    await expect(action()).resolves.toBe('best-bar');
    expect(middlewareSpy).toBeCalledTimes(1);
  });

  test('with input', async () => {
    const actionWithInput = serverAct
      .middleware(middlewareSpy)
      .input(z.string())
      .action(async ({ctx, input}) => Promise.resolve(`${ctx.prefix}-${input}-bar`));

    expectTypeOf(actionWithInput).parameter(0).toBeString();
    expectTypeOf(actionWithInput).returns.resolves.toBeString();
    await expect(actionWithInput('foo')).resolves.toBe('best-foo-bar');
    expect(middlewareSpy).toBeCalledTimes(1);
  });
});
