import { describe, expect, test } from "vitest";
import { experimental_chainMiddleware, serverAct } from "../src";

describe("experimental_chainMiddleware", () => {
  test("merges middleware patches", async () => {
    const middleware = experimental_chainMiddleware(
      async () => ({ prefix: "best" }),
      async (ctx) => {
        const prefix = (ctx as { prefix?: string } | undefined)?.prefix ?? "";
        return { message: `${prefix}-bar` };
      },
    );

    const action = serverAct
      .middleware(middleware)
      .action(async ({ ctx }) => ctx);

    await expect(action()).resolves.toEqual({
      prefix: "best",
      message: "best-bar",
    });
  });

  test("ignores undefined patches", async () => {
    const middleware = experimental_chainMiddleware(
      async () => undefined,
      async () => ({ value: "ok" }),
    );

    const action = serverAct
      .middleware(middleware)
      .action(async ({ ctx }) => ctx);

    await expect(action()).resolves.toEqual({ value: "ok" });
  });

  test("throws on non-object return", async () => {
    const middleware = experimental_chainMiddleware(
      async () => "nope" as never,
    );

    const action = serverAct.middleware(middleware).action(async () => "ok");

    await expect(action()).rejects.toThrow(
      "server-act: middleware must return an object or undefined.",
    );
  });
});
