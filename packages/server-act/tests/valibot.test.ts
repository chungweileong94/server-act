import * as v from "valibot";
import { beforeEach, describe, expect, expectTypeOf, test, vi } from "vitest";
import { serverAct } from "../src";

describe("action", () => {
  test("should able to create action with input", async () => {
    const action = serverAct
      .input(v.string())
      .action(async () => Promise.resolve("bar"));

    expectTypeOf(action).toEqualTypeOf<(input: string) => Promise<string>>();

    expect(action.constructor.name).toBe("AsyncFunction");
    await expect(action("foo")).resolves.toBe("bar");
  });

  test("should able to create action with input and check validation action", async () => {
    const action = serverAct
      .input(
        v.pipe(
          v.string(),
          v.check((s) => s.startsWith("f")),
        ),
      )
      .action(async () => Promise.resolve("bar"));

    expectTypeOf(action).toEqualTypeOf<(input: string) => Promise<string>>();

    expect(action.constructor.name).toBe("AsyncFunction");
    await expect(action("foo")).resolves.toBe("bar");
  });

  test("should able to create action with optional input", async () => {
    const action = serverAct
      .input(v.optional(v.string()))
      .action(async ({ input }) => Promise.resolve(input ?? "bar"));

    expectTypeOf(action).toEqualTypeOf<(input?: string) => Promise<string>>();

    expect(action.constructor.name).toBe("AsyncFunction");
    await expect(action("foo")).resolves.toBe("foo");
    await expect(action()).resolves.toBe("bar");
  });

  test("should throw error if the input is invalid", async () => {
    const action = serverAct
      .input(v.string())
      .action(async () => Promise.resolve("bar"));

    expectTypeOf(action).toEqualTypeOf<(input: string) => Promise<string>>();

    expect(action.constructor.name).toBe("AsyncFunction");
    // @ts-ignore
    await expect(action(1)).rejects.toThrowError();
  });

  describe("middleware should be called once", () => {
    const middlewareSpy = vi.fn(() => {
      return { prefix: "best" };
    });

    beforeEach(() => {
      vi.restoreAllMocks();
    });

    test("without input", async () => {
      const action = serverAct
        .middleware(middlewareSpy)
        .action(async ({ ctx }) => Promise.resolve(`${ctx.prefix}-bar`));

      expectTypeOf(action).toEqualTypeOf<() => Promise<string>>();

      expect(action.constructor.name).toBe("AsyncFunction");
      await expect(action()).resolves.toBe("best-bar");
      expect(middlewareSpy).toBeCalledTimes(1);
    });

    test("with input", async () => {
      const action = serverAct
        .middleware(middlewareSpy)
        .input(v.string())
        .action(async ({ ctx, input }) =>
          Promise.resolve(`${ctx.prefix}-${input}-bar`),
        );

      expectTypeOf(action).toEqualTypeOf<(param: string) => Promise<string>>();

      expect(action.constructor.name).toBe("AsyncFunction");
      await expect(action("foo")).resolves.toBe("best-foo-bar");
      expect(middlewareSpy).toBeCalledTimes(1);
    });
  });

  test("should able to access middleware context in input", async () => {
    const action = serverAct
      .middleware(() => ({ prefix: "best" }))
      .input(({ ctx }) =>
        v.pipe(
          v.string(),
          v.transform((v) => `${ctx.prefix}-${v}`),
        ),
      )
      .action(async ({ ctx, input }) => {
        return Promise.resolve(`${input}-${ctx.prefix}-bar`);
      });

    expectTypeOf(action).toEqualTypeOf<(param: string) => Promise<string>>();

    expect(action.constructor.name).toBe("AsyncFunction");

    await expect(action("foo")).resolves.toBe("best-foo-best-bar");
  });
});

describe("stateAction", () => {
  test("should able to create form action with input", async () => {
    const action = serverAct
      .input(v.object({ foo: v.string() }))
      .stateAction(async () => Promise.resolve("bar"));

    expectTypeOf(action).toEqualTypeOf<
      (
        prevState: string | undefined,
        formData: { foo: string },
      ) => Promise<string | undefined>
    >();

    expect(action.constructor.name).toBe("AsyncFunction");
    await expect(action("foo", { foo: "bar" })).resolves.toMatchObject("bar");
  });

  test("should return form errors if the input is invalid", async () => {
    const action = serverAct
      .input(v.object({ foo: v.string() }))
      .stateAction(async ({ formErrors }) => {
        if (formErrors) {
          return formErrors;
        }
        return Promise.resolve("bar");
      });

    type State =
      | string
      | { messages: string[]; fieldErrors: Record<string, string[]> };
    expectTypeOf(action).toEqualTypeOf<
      (
        prevState: State | undefined,
        formData: { foo: string },
      ) => Promise<State | undefined>
    >();

    expect(action.constructor.name).toBe("AsyncFunction");

    // @ts-expect-error
    const result = await action("foo", { bar: "foo" });
    expect(result).toHaveProperty("fieldErrors.foo");
  });

  test("should able to access middleware context", async () => {
    const action = serverAct
      .middleware(() => ({ prefix: "best" }))
      .input(({ ctx }) =>
        v.object({
          foo: v.pipe(
            v.string(),
            v.transform((v) => `${ctx.prefix}-${v}`),
          ),
        }),
      )
      .stateAction(async ({ ctx, formErrors, input }) => {
        if (formErrors) {
          return formErrors;
        }
        return Promise.resolve(`${input.foo}-${ctx.prefix}-bar`);
      });

    type State =
      | string
      | { messages: string[]; fieldErrors: Record<string, string[]> };
    expectTypeOf(action).toEqualTypeOf<
      (
        prevState: State | undefined,
        formData: { foo: string },
      ) => Promise<State | undefined>
    >();

    expect(action.constructor.name).toBe("AsyncFunction");
    await expect(action("foo", { foo: "bar" })).resolves.toMatchObject(
      "best-bar-best-bar",
    );
  });
});
