import { describe, expect, test, vi } from "vitest";
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
    "uses empty object when initial context is %p",
    async (initialCtx) => {
      const middleware = vi.fn(({ ctx }) => {
        expect(ctx).toEqual({});
        return { ok: true };
      });

      const result = await executeMiddlewares([middleware], initialCtx);

      expect(result).toEqual({ ok: true });
      expect(middleware).toHaveBeenCalledTimes(1);
    },
  );

  test("executes middlewares sequentially and passes merged context", async () => {
    const order: string[] = [];

    const result = await executeMiddlewares([
      async () => {
        order.push("first");
        await Promise.resolve();
        return { a: 1 };
      },
      ({ ctx }) => {
        order.push("second");
        expect(ctx).toEqual({ a: 1 });
        return { b: 2 };
      },
    ]);

    expect(order).toEqual(["first", "second"]);
    expect(result).toEqual({ a: 1, b: 2 });
  });

  test("merges shallowly and later values override earlier ones", async () => {
    const result = await executeMiddlewares(
      [
        () => ({ shared: "m1", nested: { from: "m1" } }),
        () => ({ shared: "m2" }),
      ],
      { shared: "init", nested: { from: "init" } },
    );

    expect(result).toEqual({ shared: "m2", nested: { from: "m1" } });
  });

  test("ignores non-object and falsy middleware returns", async () => {
    const result = await executeMiddlewares([
      () => undefined,
      () => null,
      () => 0,
      () => "",
      () => false,
      () => ({ ok: true }),
    ]);

    expect(result).toEqual({ ok: true });
  });

  test("propagates thrown errors and stops subsequent middleware execution", async () => {
    const neverCalled = vi.fn(() => ({ skipped: true }));

    await expect(
      executeMiddlewares([
        () => ({ a: 1 }),
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
      executeMiddlewares([() => Promise.reject(new Error("reject boom"))]),
    ).rejects.toThrow("reject boom");
  });
});
