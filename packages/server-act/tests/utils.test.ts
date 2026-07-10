import { describe, expect, test } from "vite-plus/test";
import { formDataToObject } from "../src/utils";

describe("formDataToObject", () => {
  test("should handle simple key-value pairs", () => {
    const formData = new FormData();
    formData.append("name", "John");
    formData.append("email", "john@example.com");
    formData.append("age", "30");

    const result = formDataToObject(formData);

    expect(result).toEqual({
      name: "John",
      email: "john@example.com",
      age: "30",
    });
  });

  test("should handle nested objects with dot notation", () => {
    const formData = new FormData();
    formData.append("user.name", "Alice");
    formData.append("user.email", "alice@example.com");
    formData.append("user.profile.bio", "Software Engineer");

    const result = formDataToObject(formData);

    expect(result).toEqual({
      user: {
        name: "Alice",
        email: "alice@example.com",
        profile: {
          bio: "Software Engineer",
        },
      },
    });
  });

  test("should handle array notation with bracket indices", () => {
    const formData = new FormData();
    formData.append("items[0]", "apple");
    formData.append("items[1]", "banana");
    formData.append("items[2]", "cherry");

    const result = formDataToObject(formData);

    expect(result).toEqual({
      items: ["apple", "banana", "cherry"],
    });
  });

  test("should handle mixed nested objects and arrays", () => {
    const formData = new FormData();
    formData.append("users[0].name", "John");
    formData.append("users[0].age", "25");
    formData.append("users[1].name", "Jane");
    formData.append("users[1].age", "30");
    formData.append("users[0].hobbies[0]", "reading");
    formData.append("users[0].hobbies[1]", "gaming");

    const result = formDataToObject(formData);

    expect(result).toEqual({
      users: [
        {
          name: "John",
          age: "25",
          hobbies: ["reading", "gaming"],
        },
        {
          name: "Jane",
          age: "30",
        },
      ],
    });
  });

  test("should handle empty FormData", () => {
    const formData = new FormData();
    const result = formDataToObject(formData);

    expect(result).toEqual({});
  });

  test("should handle File objects", () => {
    const formData = new FormData();
    const file = new File(["content"], "test.txt", { type: "text/plain" });
    formData.append("document", file);
    formData.append("user.avatar", file);

    const result = formDataToObject(formData);

    expect(result.document).toBe(file);
    expect((result.user as Record<string, unknown>).avatar).toBe(file);
  });

  test("should handle multiple values with same key (creates array)", () => {
    const formData = new FormData();
    formData.append("name", "first");
    formData.append("name", "second");
    formData.append("name", "third");

    const result = formDataToObject(formData);

    expect(result).toEqual({
      name: ["first", "second", "third"],
    });
  });

  test("should handle complex nested structures", () => {
    const formData = new FormData();
    formData.append("form.sections[0].title", "Personal Info");
    formData.append("form.sections[0].fields[0].name", "firstName");
    formData.append("form.sections[0].fields[0].value", "John");
    formData.append("form.sections[0].fields[1].name", "lastName");
    formData.append("form.sections[0].fields[1].value", "Doe");
    formData.append("form.sections[1].title", "Contact");
    formData.append("form.sections[1].fields[0].name", "email");
    formData.append("form.sections[1].fields[0].value", "john.doe@example.com");

    const result = formDataToObject(formData);

    expect(result).toEqual({
      form: {
        sections: [
          {
            title: "Personal Info",
            fields: [
              { name: "firstName", value: "John" },
              { name: "lastName", value: "Doe" },
            ],
          },
          {
            title: "Contact",
            fields: [{ name: "email", value: "john.doe@example.com" }],
          },
        ],
      },
    });
  });

  test("should handle mixed bracket and dot notation", () => {
    const formData = new FormData();
    formData.append("data[key].nested", "value1");
    formData.append("data.key[0]", "value2");
    formData.append("mixed[0].prop.sub[1]", "value3");

    const result = formDataToObject(formData);

    expect(result).toEqual({
      data: {
        key: {
          nested: "value1",
          "0": "value2",
        },
      },
      mixed: [
        {
          prop: {
            sub: [undefined, "value3"],
          },
        },
      ],
    });
  });

  test("should handle array-to-object conversion when non-numeric key follows", () => {
    const formData = new FormData();
    formData.append("items[0]", "first");
    formData.append("items[1]", "second");
    formData.append("items.length", "2");

    const result = formDataToObject(formData);

    expect(result).toEqual({
      items: {
        "0": "first",
        "1": "second",
        length: "2",
      },
    });
  });

  test("should handle keys with special characters in brackets", () => {
    const formData = new FormData();
    formData.append("data[key-with-dash]", "value1");
    formData.append("data[key_with_underscore]", "value2");
    formData.append("data[key with spaces]", "value3");

    const result = formDataToObject(formData);

    expect(result).toEqual({
      data: {
        "key-with-dash": "value1",
        key_with_underscore: "value2",
        "key with spaces": "value3",
      },
    });
  });

  test("should handle deeply nested array structures", () => {
    const formData = new FormData();
    formData.append("matrix[0][0]", "a");
    formData.append("matrix[0][1]", "b");
    formData.append("matrix[1][0]", "c");
    formData.append("matrix[1][1]", "d");

    const result = formDataToObject(formData);

    expect(result).toEqual({
      matrix: [
        ["a", "b"],
        ["c", "d"],
      ],
    });
  });

  test("should handle paths deeper than the call stack", () => {
    const depth = 10_000;
    const parts = Array.from({ length: depth }, (_, index) => `level${index}`);
    const formData = new FormData();
    formData.append(parts.join("."), "value");

    const result = formDataToObject(formData);
    let current: unknown = result;

    for (const part of parts) {
      current = (current as Record<string, unknown>)[part];
    }

    expect(current).toBe("value");
  });

  test("should handle multiple values with nested paths", () => {
    const formData = new FormData();
    formData.append("users[0].tags", "frontend");
    formData.append("users[0].tags", "react");
    formData.append("users[0].tags", "typescript");

    const result = formDataToObject(formData);

    expect(result).toEqual({
      users: [
        {
          tags: ["frontend", "react", "typescript"],
        },
      ],
    });
  });

  test("should handle empty bracket notation", () => {
    const formData = new FormData();
    formData.append("items[]", "first");
    formData.append("items[]", "second");
    formData.append("items[]", "third");

    const result = formDataToObject(formData);

    expect(result).toEqual({
      items: ["first", "second", "third"],
    });
  });

  test("should handle mixed data types with File objects in arrays", () => {
    const formData = new FormData();
    const file1 = new File(["content1"], "file1.txt", { type: "text/plain" });
    const file2 = new File(["content2"], "file2.txt", { type: "text/plain" });

    formData.append("uploads[0].file", file1);
    formData.append("uploads[0].name", "First File");
    formData.append("uploads[1].file", file2);
    formData.append("uploads[1].name", "Second File");

    const result = formDataToObject(formData);

    expect(result).toEqual({
      uploads: [
        {
          file: file1,
          name: "First File",
        },
        {
          file: file2,
          name: "Second File",
        },
      ],
    });
  });

  test("should handle string values that look like array indices", () => {
    const formData = new FormData();
    formData.append("data.0", "value0");
    formData.append("data.1", "value1");
    formData.append("data.10", "value10");

    const result = formDataToObject(formData);

    expect(result).toEqual({
      data: [
        "value0",
        "value1",
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        "value10",
      ],
    });
  });

  test("should handle empty string values", () => {
    const formData = new FormData();
    formData.append("empty", "");
    formData.append("nested.empty", "");
    formData.append("array[0]", "");

    const result = formDataToObject(formData);

    expect(result).toEqual({
      empty: "",
      nested: {
        empty: "",
      },
      array: [""],
    });
  });

  test("should handle complex key patterns", () => {
    const formData = new FormData();
    formData.append("a.b.c.d.e", "deep");
    formData.append("x[0][1][2]", "nested-array");
    formData.append("mixed[0].deep.array[1]", "complex");

    const result = formDataToObject(formData);

    expect(result).toEqual({
      a: {
        b: {
          c: {
            d: {
              e: "deep",
            },
          },
        },
      },
      x: [[undefined, [undefined, undefined, "nested-array"]]],
      mixed: [
        {
          deep: {
            array: [undefined, "complex"],
          },
        },
      ],
    });
  });

  test("should handle whitespace in values", () => {
    const formData = new FormData();
    formData.append("text", "  spaced  ");
    formData.append("multiline", "line1\nline2\nline3");
    formData.append("tabs", "value\twith\ttabs");

    const result = formDataToObject(formData);

    expect(result).toEqual({
      text: "  spaced  ",
      multiline: "line1\nline2\nline3",
      tabs: "value\twith\ttabs",
    });
  });

  test("should handle single character keys", () => {
    const formData = new FormData();
    formData.append("a", "value-a");
    formData.append("b[0]", "value-b0");
    formData.append("c.d", "value-cd");

    const result = formDataToObject(formData);

    expect(result).toEqual({
      a: "value-a",
      b: ["value-b0"],
      c: {
        d: "value-cd",
      },
    });
  });

  describe("prototype pollution", () => {
    test.each(["__proto__", "constructor", "prototype"])(
      "should reject top-level unsafe key `%s`",
      (unsafeKey) => {
        const formData = new FormData();
        formData.append(unsafeKey, "value");

        expect(() => formDataToObject(formData)).toThrow(
          `Unsafe form data key "${unsafeKey}" is not allowed`,
        );
      },
    );

    test("should reject unsafe key in nested dot path", () => {
      const formData = new FormData();
      formData.append("__proto__.polluted", "yes");

      expect(() => formDataToObject(formData)).toThrow(
        `Unsafe form data key "__proto__" is not allowed`,
      );
    });

    test("should reject unsafe key in the middle of a path", () => {
      const formData = new FormData();
      formData.append("user.constructor.prototype.polluted", "yes");

      expect(() => formDataToObject(formData)).toThrow(
        `Unsafe form data key "constructor" is not allowed`,
      );
    });

    test("should not pollute Object.prototype", () => {
      const formData = new FormData();
      formData.append("constructor.prototype.polluted", "yes");
      formData.append("__proto__.polluted", "yes");

      // Both entries throw, but critically nothing leaks onto the prototype.
      expect(() => formDataToObject(formData)).toThrow();
      expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    });
  });

  describe("conflicting keys", () => {
    test("should throw when descending into an existing scalar value", () => {
      const formData = new FormData();
      formData.append("a", "x");
      formData.append("a.b", "y");

      expect(() => formDataToObject(formData)).toThrow(
        `Conflicting form data key "a.b": "a" is already a value`,
      );
    });

    test("should throw when a scalar collides with an existing nested object", () => {
      const formData = new FormData();
      formData.append("a.b", "y");
      formData.append("a", "x");

      expect(() => formDataToObject(formData)).toThrow(
        `Conflicting form data key "a": already holds a nested object`,
      );
    });

    test("should throw when descending into an existing File value", () => {
      const formData = new FormData();
      const file = new File(["content"], "test.txt", { type: "text/plain" });
      formData.append("doc", file);
      formData.append("doc.name", "renamed");

      expect(() => formDataToObject(formData)).toThrow(
        `Conflicting form data key "doc.name": "doc" is already a value`,
      );
    });

    test("should collapse multiple files under the same key into an array", () => {
      const formData = new FormData();
      const file1 = new File(["1"], "a.txt", { type: "text/plain" });
      const file2 = new File(["2"], "b.txt", { type: "text/plain" });
      formData.append("files", file1);
      formData.append("files", file2);

      const result = formDataToObject(formData);

      expect(result).toEqual({ files: [file1, file2] });
    });
  });
});
