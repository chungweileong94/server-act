import * as v from "valibot";
import { beforeEach, describe, expect, expectTypeOf, test, vi } from "vitest";
import { serverAct } from "../src";
import { formDataToObject } from "../src/utils";

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
    // @ts-expect-error
    await expect(action(1)).rejects.toThrowError();
  });

  describe("middleware should be called once", () => {
    const middlewareSpy = vi.fn(() => {
      return { prefix: "best" };
    });

    beforeEach(() => {
      vi.clearAllMocks();
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
  test("should able to create action with input", async () => {
    const action = serverAct
      .input(v.object({ foo: v.string() }))
      .stateAction(async () => Promise.resolve("bar"));

    expectTypeOf(action).toEqualTypeOf<
      (
        prevState: string | undefined,
        input: { foo: string },
      ) => Promise<string | undefined>
    >();

    expect(action.constructor.name).toBe("AsyncFunction");
    await expect(action("foo", { foo: "bar" })).resolves.toMatch("bar");
  });

  test("should able to work with `formDataToObject`", async () => {
    const action = serverAct
      .input(
        v.pipe(
          v.custom<FormData>((value) => value instanceof FormData),
          v.transform(formDataToObject),
          v.object({ foo: v.string() }),
        ),
      )
      .stateAction(async ({ input, inputErrors }) => {
        if (inputErrors) {
          return inputErrors;
        }
        return Promise.resolve(input.foo);
      });

    type State =
      | string
      | { messages: string[]; fieldErrors: Record<string, string[]> };
    expectTypeOf(action).toEqualTypeOf<
      (
        prevState: State | undefined,
        input: FormData,
      ) => Promise<State | undefined>
    >();

    expect(action.constructor.name).toBe("AsyncFunction");

    const formData = new FormData();
    formData.append("foo", "bar");
    await expect(action("foo", formData)).resolves.toMatch("bar");
  });

  test("should return input errors if the input is invalid", async () => {
    const action = serverAct
      .input(v.object({ foo: v.string() }))
      .stateAction(async ({ inputErrors }) => {
        if (inputErrors) {
          return inputErrors;
        }
        return Promise.resolve("bar");
      });

    type State =
      | string
      | { messages: string[]; fieldErrors: Record<string, string[]> };
    expectTypeOf(action).toEqualTypeOf<
      (
        prevState: State | undefined,
        input: { foo: string },
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
      .stateAction(async ({ ctx, inputErrors, input }) => {
        if (inputErrors) {
          return inputErrors;
        }
        return Promise.resolve(`${input.foo}-${ctx.prefix}-bar`);
      });

    type State =
      | string
      | { messages: string[]; fieldErrors: Record<string, string[]> };
    expectTypeOf(action).toEqualTypeOf<
      (
        prevState: State | undefined,
        input: { foo: string },
      ) => Promise<State | undefined>
    >();

    expect(action.constructor.name).toBe("AsyncFunction");
    await expect(action("foo", { foo: "bar" })).resolves.toMatch(
      "best-bar-best-bar",
    );
  });
});

describe("formAction", () => {
  test("should able to create form action with input", async () => {
    const action = serverAct
      .input(v.object({ foo: v.string() }))
      .formAction(async () => Promise.resolve("bar"));

    expectTypeOf(action).toEqualTypeOf<
      (
        prevState: string | undefined,
        formData: { foo: string },
      ) => Promise<string | undefined>
    >();

    expect(action.constructor.name).toBe("AsyncFunction");
    await expect(action("foo", { foo: "bar" })).resolves.toMatch("bar");
  });

  test("should return form errors if the input is invalid", async () => {
    const action = serverAct
      .input(v.object({ foo: v.string() }))
      .formAction(async ({ formErrors }) => {
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
      .formAction(async ({ ctx, formErrors, input }) => {
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
    await expect(action("foo", { foo: "bar" })).resolves.toMatch(
      "best-bar-best-bar",
    );
  });
});
