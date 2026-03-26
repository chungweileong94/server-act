import { describe, expect, test, vi } from "vite-plus/test";
import { executeMiddlewares } from "./middleware";

describe("executeMiddlewares", () => {
  test("returns empty object with no middlewares and no initial context", async () => {
    await expect(executeMiddlewares([])).resolves.toEqual({});
  });

  test("clones object initial context", async () => {
    const initialCtx = { a: 1 };

    const result = await executeMiddlewares([], initialCtx);

    expect(result).toEqual({ a: 1 });
    expect(result).not.toBe(initialCtx);
  });

  test.each([undefined, null, "", 0, false, "x"])(
    "uses empty object when initial context is `%s`",
    async (initialCtx) => {
      const middleware = vi.fn(({ ctx }) => {
        expect(ctx).toEqual({});
        return { ok: true };
      });

      const result = await executeMiddlewares(
        [{ kind: "legacy", middleware }],
        initialCtx,
      );

      expect(result).toEqual({ ok: true });
      expect(middleware).toHaveBeenCalledTimes(1);
    },
  );

  test("executes middlewares sequentially and passes merged context", async () => {
    const order: string[] = [];

    const result = await executeMiddlewares([
      {
        kind: "legacy",
        middleware: async () => {
          order.push("first");
          await Promise.resolve();
          return { a: 1 };
        },
      },
      {
        kind: "legacy",
        middleware: ({ ctx }) => {
          order.push("second");
          expect(ctx).toEqual({ a: 1 });
          return { b: 2 };
        },
      },
    ]);

    expect(order).toEqual(["first", "second"]);
    expect(result).toEqual({ a: 1, b: 2 });
  });

  test("executes `.use()` middlewares sequentially via next", async () => {
    const order: string[] = [];

    const result = await executeMiddlewares([
      {
        kind: "use",
        middleware: async ({ ctx, next }) => {
          order.push("first");
          expect(ctx).toEqual({});
          await Promise.resolve();
          return await next({ ctx: { a: 1 } });
        },
      },
      {
        kind: "use",
        middleware: ({ ctx, next }) => {
          order.push("second");
          expect(ctx).toEqual({ a: 1 });
          return next({ ctx: { b: 2 } });
        },
      },
    ]);

    expect(order).toEqual(["first", "second"]);
    expect(result).toEqual({ a: 1, b: 2 });
  });

  test("preserves mixed middleware order", async () => {
    const order: string[] = [];

    const result = await executeMiddlewares([
      {
        kind: "legacy",
        middleware: () => {
          order.push("first");
          return { a: 1 };
        },
      },
      {
        kind: "use",
        middleware: ({ next }) => {
          order.push("second");
          return next({ ctx: { b: 2 } });
        },
      },
      {
        kind: "legacy",
        middleware: ({ ctx }) => {
          order.push("third");
          return { c: (ctx as { a: number; b: number }).b };
        },
      },
    ]);

    expect(order).toEqual(["first", "second", "third"]);
    expect(result).toEqual({ a: 1, b: 2, c: 2 });
  });

  test("merges shallowly and later values override earlier ones", async () => {
    const result = await executeMiddlewares(
      [
        {
          kind: "legacy",
          middleware: () => ({ shared: "m1", nested: { from: "m1" } }),
        },
        {
          kind: "legacy",
          middleware: () => ({ shared: "m2" }),
        },
      ],
      { shared: "init", nested: { from: "init" } },
    );

    expect(result).toEqual({ shared: "m2", nested: { from: "m1" } });
  });

  test("ignores non-object and falsy middleware returns", async () => {
    const result = await executeMiddlewares([
      { kind: "legacy", middleware: () => undefined },
      { kind: "legacy", middleware: () => null },
      { kind: "legacy", middleware: () => 0 },
      { kind: "legacy", middleware: () => "" },
      { kind: "legacy", middleware: () => false },
      { kind: "legacy", middleware: () => ({ ok: true }) },
    ]);

    expect(result).toEqual({ ok: true });
  });

  test("returns context from the deepest next() call", async () => {
    const result = await executeMiddlewares([
      {
        kind: "use",
        middleware: ({ next }) => next({ ctx: { a: 1 } }),
      },
      {
        kind: "use",
        middleware: ({ next }) => next({ ctx: { a: 2, b: 3 } }),
      },
    ]);

    expect(result).toEqual({ a: 2, b: 3 });
  });

  test("allows calling next without params", async () => {
    const result = await executeMiddlewares([
      {
        kind: "use",
        middleware: ({ next }) => next(),
      },
    ]);

    expect(result).toEqual({});
  });

  test("throws when a `.use()` middleware does not call next()", async () => {
    await expect(
      executeMiddlewares([
        {
          kind: "use",
          middleware: async () => ({}),
        },
      ]),
    ).rejects.toThrow(".use() middleware must call next()");
  });

  test("propagates thrown errors and stops subsequent middleware execution", async () => {
    const neverCalled = vi.fn(() => ({ skipped: true }));

    await expect(
      executeMiddlewares([
        {
          kind: "legacy",
          middleware: () => ({ a: 1 }),
        },
        {
          kind: "legacy",
          middleware: () => {
            throw new Error("boom");
          },
        },
        {
          kind: "legacy",
          middleware: neverCalled,
        },
      ]),
    ).rejects.toThrow("boom");

    expect(neverCalled).not.toHaveBeenCalled();
  });

  test("propagates rejected promises", async () => {
    await expect(
      executeMiddlewares([
        {
          kind: "legacy",
          middleware: () => Promise.reject(new Error("reject boom")),
        },
      ]),
    ).rejects.toThrow("reject boom");
  });
});
