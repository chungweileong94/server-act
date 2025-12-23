import { beforeEach, describe, expect, expectTypeOf, test, vi } from "vitest";
import { z } from "zod";
import { serverAct } from "../src";
import { formDataToObject } from "../src/utils";

function zodFormData<T extends z.ZodType>(
  schema: T,
): z.ZodPipe<z.ZodTransform<Record<string, unknown>, FormData>, T> {
  return z.preprocess<Record<string, unknown>, T, FormData>(
    (v) => formDataToObject(v),
    schema,
  );
}

describe("action", () => {
  test("should able to create action without input", async () => {
    const action = serverAct.action(async () => Promise.resolve("bar"));

    expectTypeOf(action).toEqualTypeOf<() => Promise<string>>();

    expect(action.constructor.name).toBe("AsyncFunction");
    await expect(action()).resolves.toBe("bar");
  });

  test("should able to create action with input", async () => {
    const action = serverAct
      .input(z.string())
      .action(async () => Promise.resolve("bar"));

    expectTypeOf(action).toEqualTypeOf<(input: string) => Promise<string>>();

    expect(action.constructor.name).toBe("AsyncFunction");
    await expect(action("foo")).resolves.toBe("bar");
  });

  test("should able to create action with input and zod refinement", async () => {
    const action = serverAct
      .input(z.string().refine((s) => s.startsWith("f")))
      .action(async () => Promise.resolve("bar"));

    expectTypeOf(action).toEqualTypeOf<(input: string) => Promise<string>>();

    expect(action.constructor.name).toBe("AsyncFunction");
    await expect(action("foo")).resolves.toBe("bar");
  });

  test("should able to create action with optional input", async () => {
    const action = serverAct
      .input(z.string().optional())
      .action(async ({ input }) => Promise.resolve(input ?? "bar"));

    expectTypeOf(action).toEqualTypeOf<(input?: string) => Promise<string>>();

    expect(action.constructor.name).toBe("AsyncFunction");
    await expect(action("foo")).resolves.toBe("foo");
    await expect(action()).resolves.toBe("bar");
  });

  test("should throw error if the input is invalid", async () => {
    const action = serverAct
      .input(z.string())
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
        .input(z.string())
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
      .input(({ ctx }) => z.string().transform((v) => `${ctx.prefix}-${v}`))
      .action(async ({ ctx, input }) => {
        return Promise.resolve(`${input}-${ctx.prefix}-bar`);
      });

    expectTypeOf(action).toEqualTypeOf<(param: string) => Promise<string>>();

    expect(action.constructor.name).toBe("AsyncFunction");

    await expect(action("foo")).resolves.toBe("best-foo-best-bar");
  });
});

describe("stateAction", () => {
  test("should able to create action without input", async () => {
    const action = serverAct.stateAction(async () => Promise.resolve("bar"));

    expectTypeOf(action).toEqualTypeOf<
      (
        prevState: string | undefined,
        input: undefined,
      ) => Promise<string | undefined>
    >();

    expect(action.constructor.name).toBe("AsyncFunction");

    await expect(action("foo", undefined)).resolves.toMatchObject("bar");
  });

  test("should able to create action with input", async () => {
    const action = serverAct
      .input(z.object({ foo: z.string() }))
      .stateAction(async () => Promise.resolve("bar"));

    expectTypeOf(action).toEqualTypeOf<
      (
        prevState: string | undefined,
        input: { foo: string },
      ) => Promise<string | undefined>
    >();

    expect(action.constructor.name).toBe("AsyncFunction");
    await expect(action("foo", { foo: "bar" })).resolves.toMatchObject("bar");
  });

  test("should return input errors if the input is invalid", async () => {
    const action = serverAct
      .input(z.object({ foo: z.string({ error: "Required" }) }))
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
    expect(result).toHaveProperty("fieldErrors.foo", ["Required"]);
  });

  test("should able to work with `formDataToObject`", async () => {
    const action = serverAct
      .input(
        zodFormData(
          z.object({
            list: z.array(z.object({ foo: z.string() })),
          }),
        ),
      )
      .stateAction(async ({ inputErrors, input }) => {
        if (inputErrors) {
          return inputErrors;
        }
        return Promise.resolve(
          `${input.list.map((item) => item.foo).join(",")}`,
        );
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
    formData.append("list.0.foo", "1");
    formData.append("list.1.foo", "2");

    const result = await action(undefined, formData);
    expect(result).toBe("1,2");
  });

  test("should return a correct input errors with `formDataToObject`", async () => {
    const action = serverAct
      .input(
        zodFormData(
          z.object({
            list: z.array(
              z.object({ foo: z.string().min(1, { error: "Required" }) }),
            ),
          }),
        ),
      )
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
        input: FormData,
      ) => Promise<State | undefined>
    >();

    expect(action.constructor.name).toBe("AsyncFunction");

    const formData = new FormData();
    formData.append("list.0.foo", "");

    const result = await action(undefined, formData);
    expect(result).toHaveProperty("fieldErrors", {
      "list.0.foo": ["Required"],
    });
  });

  test("should able to access middleware context", async () => {
    const action = serverAct
      .middleware(() => ({ prefix: "best" }))
      .input(({ ctx }) =>
        z.object({
          foo: z.string().transform((v) => `${ctx.prefix}-${v}`),
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
    await expect(action("foo", { foo: "bar" })).resolves.toMatchObject(
      "best-bar-best-bar",
    );
  });

  test("should able to infer the state correctly if `prevState` is being accessed", async () => {
    const action = serverAct.stateAction(async ({ prevState }) => {
      if (prevState == null) {
        return Promise.resolve("foo");
      }
      return Promise.resolve("bar");
    });

    expectTypeOf(action).toEqualTypeOf<
      (
        prevState: string | undefined,
        input: undefined,
      ) => Promise<string | undefined>
    >();

    expect(action.constructor.name).toBe("AsyncFunction");

    await expect(action(undefined, undefined)).resolves.toMatchObject("foo");
  });

  test("should able to infer the state correctly if `prevState` is being typed", async () => {
    const action = serverAct.stateAction<string, number>(
      async ({ prevState }) => {
        if (typeof prevState === "number") {
          return Promise.resolve("foo");
        }
        return Promise.resolve("bar");
      },
    );

    expectTypeOf(action).toEqualTypeOf<
      (
        prevState: string | number,
        formData: undefined,
      ) => Promise<string | number>
    >();

    expect(action.constructor.name).toBe("AsyncFunction");

    await expect(action(123, undefined)).resolves.toMatchObject("foo");
  });
});

describe("formAction", () => {
  test("should able to create form action without input", async () => {
    const action = serverAct.formAction(async () => Promise.resolve("bar"));

    expectTypeOf(action).toEqualTypeOf<
      (
        prevState: string | undefined,
        formData: undefined,
      ) => Promise<string | undefined>
    >();

    expect(action.constructor.name).toBe("AsyncFunction");

    await expect(action("foo", undefined)).resolves.toMatchObject("bar");
  });

  test("should able to create form action with input", async () => {
    const action = serverAct
      .input(zodFormData(z.object({ foo: z.string() })))
      .formAction(async () => Promise.resolve("bar"));

    expectTypeOf(action).toEqualTypeOf<
      (
        prevState: string | undefined,
        formData: FormData,
      ) => Promise<string | undefined>
    >();

    expect(action.constructor.name).toBe("AsyncFunction");

    const formData = new FormData();
    formData.append("foo", "bar");
    await expect(action("foo", formData)).resolves.toMatchObject("bar");
  });

  test("should return form errors if the input is invalid", async () => {
    const action = serverAct
      .input(zodFormData(z.object({ foo: z.string({ error: "Required" }) })))
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
        formData: FormData,
      ) => Promise<State | undefined>
    >();

    expect(action.constructor.name).toBe("AsyncFunction");

    const formData = new FormData();
    formData.append("bar", "foo");

    const result = await action("foo", formData);
    expect(result).toHaveProperty("fieldErrors.foo", ["Required"]);
  });

  test("should return a correct form errors with dotpath", async () => {
    const action = serverAct
      .input(
        zodFormData(
          z.object({
            list: z.array(
              z.object({ foo: z.string().min(1, { message: "Required" }) }),
            ),
          }),
        ),
      )
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
        input: FormData,
      ) => Promise<State | undefined>
    >();

    expect(action.constructor.name).toBe("AsyncFunction");

    const formData = new FormData();
    formData.append("list.0.foo", "");

    const result = await action(undefined, formData);
    expect(result).toHaveProperty("fieldErrors", {
      "list.0.foo": ["Required"],
    });
  });

  test("should able to access middleware context", async () => {
    const action = serverAct
      .middleware(() => ({ prefix: "best" }))
      .input(({ ctx }) =>
        zodFormData(
          z.object({
            foo: z.string().transform((v) => `${ctx.prefix}-${v}`),
          }),
        ),
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
        formData: FormData,
      ) => Promise<State | undefined>
    >();

    expect(action.constructor.name).toBe("AsyncFunction");

    const formData = new FormData();
    formData.append("foo", "bar");
    await expect(action("foo", formData)).resolves.toMatchObject(
      "best-bar-best-bar",
    );
  });

  test("should able to infer the state correctly if `prevState` is being accessed", async () => {
    const action = serverAct.formAction(async ({ prevState }) => {
      if (prevState == null) {
        return Promise.resolve("foo");
      }
      return Promise.resolve("bar");
    });

    expectTypeOf(action).toEqualTypeOf<
      (
        prevState: string | undefined,
        formData: undefined,
      ) => Promise<string | undefined>
    >();

    expect(action.constructor.name).toBe("AsyncFunction");

    await expect(action(undefined, undefined)).resolves.toMatchObject("foo");
  });

  test("should able to infer the state correctly if `prevState` is being typed", async () => {
    const action = serverAct.formAction<string, number>(
      async ({ prevState }) => {
        if (typeof prevState === "number") {
          return Promise.resolve("foo");
        }
        return Promise.resolve("bar");
      },
    );

    expectTypeOf(action).toEqualTypeOf<
      (
        prevState: string | number,
        formData: undefined,
      ) => Promise<string | number>
    >();

    expect(action.constructor.name).toBe("AsyncFunction");

    await expect(action(123, undefined)).resolves.toMatchObject("foo");
  });
});
