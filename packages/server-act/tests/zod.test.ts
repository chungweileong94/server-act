import { beforeEach, describe, expect, expectTypeOf, test, vi } from "vitest";
import { z } from "zod";
import { zfd } from "zod-form-data";
import { serverAct } from "../src";

type FormDataLikeInput = {
  [Symbol.iterator](): IterableIterator<[string, FormDataEntryValue]>;
  entries(): IterableIterator<[string, FormDataEntryValue]>;
};

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
    // @ts-ignore
    await expect(action(1)).rejects.toThrowError();
  });

  test("should able to infer zfd input type correctly", async () => {
    const action = serverAct
      .input(zfd.formData({ foo: zfd.text() }))
      .action(async ({ input }) => Promise.resolve(input.foo));

    expectTypeOf(action).toEqualTypeOf<
      (input: FormData | FormDataLikeInput) => Promise<string>
    >();

    expect(action.constructor.name).toBe("AsyncFunction");
    const formData = new FormData();
    formData.append("foo", "bar");
    await expect(action(formData)).resolves.toBe("bar");
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
      .input(zfd.formData({ foo: zfd.text() }))
      .formAction(async () => Promise.resolve("bar"));

    expectTypeOf(action).toEqualTypeOf<
      (
        prevState: string | undefined,
        formData: FormData | FormDataLikeInput,
      ) => Promise<string | undefined>
    >();

    expect(action.constructor.name).toBe("AsyncFunction");

    const formData = new FormData();
    formData.append("foo", "bar");
    await expect(action("foo", formData)).resolves.toMatchObject("bar");
  });

  test("should return form errors if the input is invalid", async () => {
    const action = serverAct
      .input(
        zfd.formData({
          foo: zfd.text(z.string({ required_error: "Required" })),
        }),
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
        formData: FormData | FormDataLikeInput,
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
        zfd.formData({
          list: zfd.repeatable(
            z.array(
              z.object({
                foo: zfd.text(z.string().min(1, { message: "Required" })),
              }),
            ),
          ),
        }),
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
        formData: FormData | FormDataLikeInput,
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
        zfd.formData({
          foo: zfd.text(z.string().transform((v) => `${ctx.prefix}-${v}`)),
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
        formData: FormData | FormDataLikeInput,
      ) => Promise<State | undefined>
    >();

    expect(action.constructor.name).toBe("AsyncFunction");

    const formData = new FormData();
    formData.append("foo", "bar");
    await expect(action("foo", formData)).resolves.toMatchObject(
      "best-bar-best-bar",
    );
  });
});
