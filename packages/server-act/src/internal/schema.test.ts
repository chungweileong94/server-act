import { describe, expect, test } from "vite-plus/test";
import { getInputErrors } from "./schema";

describe("getInputErrors", () => {
  test.each(["toString", "hasOwnProperty", "constructor", "__proto__"])(
    "should collect an issue for prototype-sensitive path `%s`",
    (path) => {
      const prototypeKeys = Reflect.ownKeys(Object.prototype);

      const result = getInputErrors([
        {
          message: "Invalid value",
          path: [path],
        },
      ]);

      expect(Object.hasOwn(result.fieldErrors, path)).toBe(true);
      expect(Object.keys(result.fieldErrors)).toContain(path);
      expect(result.fieldErrors[path]).toEqual(["Invalid value"]);
      expect(Object.getPrototypeOf(result.fieldErrors)).toBe(Object.prototype);
      expect(Reflect.ownKeys(Object.prototype)).toEqual(prototypeKeys);
    },
  );

  test("should append repeated issues for an inherited property name", () => {
    const path: string = "toString";
    const result = getInputErrors([
      {
        message: "First error",
        path: [path],
      },
      {
        message: "Second error",
        path: [path],
      },
    ]);

    expect(result.fieldErrors[path]).toEqual(["First error", "Second error"]);
  });

  test("should collect pathless issues as messages", () => {
    const result = getInputErrors([
      {
        message: "Form is invalid",
      },
    ]);

    expect(result).toEqual({
      messages: ["Form is invalid"],
      fieldErrors: {},
    });
    expect(Object.getPrototypeOf(result.fieldErrors)).toBe(Object.prototype);
  });
});
