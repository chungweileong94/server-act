import { describe, expect, expectTypeOf, test, vi } from "vite-plus/test";
import { z } from "zod";
import { createServerActMiddleware, serverAct } from "../src";
import { formDataToObject } from "../src/utils";

function zodFormData<T extends z.ZodType>(
  schema: T,
): z.ZodPipe<z.ZodTransform<Record<string, unknown>, FormData>, T> {
  return z.preprocess<Record<string, unknown>, T, FormData>(
    (v) => formDataToObject(v),
    schema,
  );
}

describe("middleware", () => {
  describe("single use", () => {
    test("should work like middleware", async () => {
      const action = serverAct
        .use(({ next }) => next({ ctx: { prefix: "best" } }))
        .action(async ({ ctx }) => Promise.resolve(`${ctx.prefix}-bar`));

      expectTypeOf(action).toEqualTypeOf<() => Promise<string>>();
      expect(action.constructor.name).toBe("AsyncFunction");
      await expect(action()).resolves.toBe("best-bar");
    });

    test("should receive empty context", async () => {
      const useSpy = vi.fn(({ ctx, next }) => {
        expect(ctx).toEqual({});
        return next({ ctx: { prefix: "best" } });
      });

      const action = serverAct.use(useSpy).action(async () => "bar");

      await action();
      expect(useSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("chaining multiple use calls", () => {
    test("should chain two use calls", async () => {
      const action = serverAct
        .use(({ next }) => next({ ctx: { a: 1 } }))
        .use(({ ctx, next }) => {
          expectTypeOf(ctx).toMatchObjectType<{ a: number }>();
          return next({ ctx: { b: 2 } });
        })
        .action(async ({ ctx }) => {
          expectTypeOf(ctx).toMatchObjectType<{ a: number; b: number }>();
          return ctx.a + ctx.b;
        });

      expectTypeOf(action).toEqualTypeOf<() => Promise<number>>();
      await expect(action()).resolves.toBe(3);
    });

    test("should chain three use calls", async () => {
      const action = serverAct
        .use(({ next }) => next({ ctx: { a: 1 } }))
        .use(({ ctx, next }) => {
          return next({ ctx: { b: ctx.a + 1 } });
        })
        .use(({ ctx, next }) => {
          expectTypeOf(ctx).toMatchObjectType<{ a: number; b: number }>();
          return next({ ctx: { c: ctx.a + ctx.b } });
        })
        .action(async ({ ctx }) => {
          expectTypeOf(ctx).toMatchObjectType<{
            a: number;
            b: number;
            c: number;
          }>();
          return ctx.a + ctx.b + ctx.c;
        });

      await expect(action()).resolves.toBe(6); // 1 + 2 + 3
    });

    test("should merge contexts correctly", async () => {
      type Database = { query: () => string };
      type User = { id: string; name: string };

      const action = serverAct
        .use(({ next }) =>
          next({ ctx: { db: { query: () => "data" as string } } }),
        )
        .use(({ next }) =>
          next({
            ctx: { user: { id: "123", name: "John" } },
          }),
        )
        .use(({ next }) => next({ ctx: { permissions: ["read", "write"] } }))
        .action(async ({ ctx }) => {
          expectTypeOf(ctx.db).toEqualTypeOf<Database>();
          expectTypeOf(ctx.user).toEqualTypeOf<User>();
          expectTypeOf(ctx.permissions).toEqualTypeOf<string[]>();
          return `${ctx.user.name}:${ctx.db.query()}`;
        });

      await expect(action()).resolves.toBe("John:data");
    });
  });

  describe("use with input", () => {
    test("should access context from use in input", async () => {
      const action = serverAct
        .use(({ next }) => next({ ctx: { prefix: "best" } }))
        .input(({ ctx }) => z.string().transform((v) => `${ctx.prefix}-${v}`))
        .action(async ({ ctx, input }) => {
          return `${input}-${ctx.prefix}-bar`;
        });

      expectTypeOf(action).toEqualTypeOf<(param: string) => Promise<string>>();
      await expect(action("foo")).resolves.toBe("best-foo-best-bar");
    });

    test("should access chained context in input", async () => {
      const action = serverAct
        .use(({ next }) => next({ ctx: { prefix: "best" } }))
        .use(({ next }) => next({ ctx: { suffix: "ever" } }))
        .input(({ ctx }) =>
          z.string().transform((v) => `${ctx.prefix}-${v}-${ctx.suffix}`),
        )
        .action(async ({ input }) => {
          return input;
        });

      await expect(action("foo")).resolves.toBe("best-foo-ever");
    });
  });

  describe("use with stateAction", () => {
    test("should work with stateAction", async () => {
      const action = serverAct
        .use(({ next }) => next({ ctx: { prefix: "best" } }))
        .use(({ next }) => next({ ctx: { suffix: "ever" } }))
        .input(z.object({ foo: z.string() }))
        .stateAction(async ({ ctx, input, inputErrors }) => {
          if (inputErrors) return inputErrors;
          return `${ctx.prefix}-${input.foo}-${ctx.suffix}`;
        });

      const result = await action(undefined, { foo: "test" });
      expect(result).toBe("best-test-ever");
    });
  });

  describe("use with formAction", () => {
    test("should work with formAction", async () => {
      const action = serverAct
        .use(({ next }) => next({ ctx: { prefix: "best" } }))
        .use(({ next }) => next({ ctx: { suffix: "ever" } }))
        .input(zodFormData(z.object({ foo: z.string() })))
        .formAction(async ({ ctx, input, formErrors }) => {
          if (formErrors) return formErrors;
          return `${ctx.prefix}-${input.foo}-${ctx.suffix}`;
        });

      const formData = new FormData();
      formData.append("foo", "test");

      const result = await action(undefined, formData);
      expect(result).toBe("best-test-ever");
    });
  });

  describe("execution order", () => {
    test("should execute in order", async () => {
      const order: string[] = [];

      const action = serverAct
        .use(({ next }) => {
          order.push("first");
          return next({ ctx: { a: 1 } });
        })
        .use(({ ctx, next }) => {
          order.push("second");
          expect(ctx.a).toBe(1);
          return next({ ctx: { b: 2 } });
        })
        .use(({ ctx, next }) => {
          order.push("third");
          expect(ctx.a).toBe(1);
          expect(ctx.b).toBe(2);
          return next({ ctx: { c: 3 } });
        })
        .action(async ({ ctx }) => {
          order.push("action");
          return ctx.a + ctx.b + ctx.c;
        });

      await action();
      expect(order).toEqual(["first", "second", "third", "action"]);
    });
  });

  describe("async middlewares", () => {
    test("should handle async middlewares", async () => {
      const action = serverAct
        .use(async ({ next }) => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          return await next({ ctx: { async: "value" } });
        })
        .use(async ({ ctx, next }) => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          return await next({ ctx: { another: ctx.async } });
        })
        .action(async ({ ctx }) => {
          return `${ctx.async}-${ctx.another}`;
        });

      await expect(action()).resolves.toBe("value-value");
    });
  });

  describe("combination with middleware", () => {
    test("should work with legacy middleware before `.use()`", async () => {
      const action = serverAct
        .middleware(() => ({ legacy: "value" }))
        .use(({ ctx, next }) => {
          return next({ ctx: { new: ctx.legacy + "-new" } });
        })
        .action(async ({ ctx }) => {
          return `${ctx.legacy}-${ctx.new}`;
        });

      await expect(action()).resolves.toBe("value-value-new");
    });

    test("should work with `.use()` before legacy middleware", async () => {
      const action = serverAct
        .use(({ next }) => next({ ctx: { requestId: "request-1" } }))
        .middleware(({ ctx }) => ({
          trace: `${ctx.requestId}-trace`,
        }))
        .action(async ({ ctx }) => {
          return `${ctx.requestId}-${ctx.trace}`;
        });

      await expect(action()).resolves.toBe("request-1-request-1-trace");
    });
  });

  describe("context merging", () => {
    test("should merge contexts with object spread", async () => {
      const action = serverAct
        .use(({ next }) => next({ ctx: { shared: "first", a: 1 } }))
        .use(({ next }) => next({ ctx: { shared: "second", b: 2 } }))
        .action(async ({ ctx }) => {
          // Later value should override earlier value
          return `${ctx.shared}-${ctx.a}-${ctx.b}`;
        });

      await expect(action()).resolves.toBe("second-1-2");
    });
  });

  describe("legacy middleware compatibility", () => {
    test("should keep legacy return-based middleware working", async () => {
      const action = serverAct
        .middleware(() => ({ prefix: "best" }))
        .action(async ({ ctx }) => `${ctx.prefix}-bar`);

      await expect(action()).resolves.toBe("best-bar");
    });
  });

  describe("next ergonomics", () => {
    test("should allow calling next without params", async () => {
      const action = serverAct
        .use(async ({ next }) => {
          return await next();
        })
        .action(async () => "bar");

      await expect(action()).resolves.toBe("bar");
    });
  });

  describe("createServerActMiddleware", () => {
    test("should allow reusable middleware that adds context", async () => {
      const requestIdMiddleware = createServerActMiddleware(({ next }) =>
        next({ ctx: { requestId: "request-1" } }),
      );

      const action = serverAct
        .use(requestIdMiddleware)
        .action(async ({ ctx }) => ctx.requestId);

      await expect(action()).resolves.toBe("request-1");
    });

    test("should allow reusable middleware that depends on existing context", async () => {
      const traceMiddleware = createServerActMiddleware<
        { trace: string },
        { requestId: string }
      >(({ ctx, next }) => next({ ctx: { trace: `${ctx.requestId}-trace` } }));

      const action = serverAct
        .use(({ next }) => next({ ctx: { requestId: "request-1" } }))
        .use(traceMiddleware)
        .action(async ({ ctx }) => `${ctx.requestId}-${ctx.trace}`);

      await expect(action()).resolves.toBe("request-1-request-1-trace");
    });
  });
});
