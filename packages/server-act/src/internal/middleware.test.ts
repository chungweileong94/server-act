import { describe, expect, test, vi } from "vitest";
import { adaptLegacyMiddleware, executeMiddlewares } from "./middleware";

describe("executeMiddlewares", () => {
  test("returns empty object with no middlewares and no initial context", async () => {
    await expect(executeMiddlewares([])).resolves.toEqual({
      ctx: {},
      completed: true,
    });
  });

  test("clones object initial context", async () => {
    const initialCtx = { a: 1 };

    const result = await executeMiddlewares([], initialCtx);

    expect(result.ctx).toEqual({ a: 1 });
    expect(result.ctx).not.toBe(initialCtx);
    expect(result.completed).toBe(true);
  });

  test.each([undefined, null, "", 0, false, "x"])(
    "uses empty object when initial context is `%s`",
    async (initialCtx) => {
      const middleware = vi.fn(async ({ ctx, next }) => {
        expect(ctx).toEqual({});
        await next({ ok: true });
      });

      const result = await executeMiddlewares([middleware], initialCtx);

      expect(result).toEqual({ ctx: { ok: true }, completed: true });
      expect(middleware).toHaveBeenCalledTimes(1);
    },
  );

  test("executes middlewares sequentially and passes merged context", async () => {
    const order: string[] = [];

    const result = await executeMiddlewares([
      async ({ next }) => {
        order.push("first");
        await Promise.resolve();
        await next({ a: 1 });
      },
      async ({ ctx, next }) => {
        order.push("second");
        expect(ctx).toEqual({ a: 1 });
        await next({ b: 2 });
      },
    ]);

    expect(order).toEqual(["first", "second"]);
    expect(result).toEqual({ ctx: { a: 1, b: 2 }, completed: true });
  });

  test("merges shallowly and later values override earlier ones", async () => {
    const result = await executeMiddlewares(
      [
        async ({ next }) => {
          await next({ shared: "m1", nested: { from: "m1" } });
        },
        async ({ next }) => {
          await next({ shared: "m2" });
        },
      ],
      { shared: "init", nested: { from: "init" } },
    );

    expect(result).toEqual({
      ctx: { shared: "m2", nested: { from: "m1" } },
      completed: true,
    });
  });

  test("ignores non-object and falsy context updates", async () => {
    const result = await executeMiddlewares([
      async ({ next }) => next(),
      async ({ next }) => next(null as unknown as Record<string, unknown>),
      async ({ next }) => next(0 as unknown as Record<string, unknown>),
      async ({ next }) => next("" as unknown as Record<string, unknown>),
      async ({ next }) => next(false as unknown as Record<string, unknown>),
      async ({ next }) => next({ ok: true }),
    ]);

    expect(result).toEqual({ ctx: { ok: true }, completed: true });
  });

  test("short-circuits when middleware does not call next", async () => {
    const neverCalled = vi.fn(async ({ next }) => {
      await next({ shouldNotRun: true });
    });

    const result = await executeMiddlewares([
      async () => {
        return;
      },
      neverCalled,
    ]);

    expect(result).toEqual({ ctx: {}, completed: false });
    expect(neverCalled).not.toHaveBeenCalled();
  });

  test("throws when next is called multiple times", async () => {
    await expect(
      executeMiddlewares([
        async ({ next }) => {
          await next({ a: 1 });
          await next({ b: 2 });
        },
      ]),
    ).rejects.toThrow("next() called multiple times");
  });

  test("propagates thrown errors and stops subsequent middleware execution", async () => {
    const neverCalled = vi.fn(async ({ next }) => {
      await next({ skipped: true });
    });

    await expect(
      executeMiddlewares([
        async ({ next }) => {
          await next({ a: 1 });
        },
        () => {
          throw new Error("boom");
        },
        neverCalled,
      ]),
    ).rejects.toThrow("boom");

    expect(neverCalled).not.toHaveBeenCalled();
  });

  test("propagates rejected promises", async () => {
    await expect(
      executeMiddlewares([
        () => Promise.reject(new Error("reject boom")),
      ]),
    ).rejects.toThrow("reject boom");
  });

  test("adapts legacy middleware behavior", async () => {
    const result = await executeMiddlewares([
      adaptLegacyMiddleware(() => ({ a: 1 })),
      adaptLegacyMiddleware(({ ctx }) => ({ b: ctx.a })),
    ]);

    expect(result).toEqual({ ctx: { a: 1, b: 1 }, completed: true });
  });
});
