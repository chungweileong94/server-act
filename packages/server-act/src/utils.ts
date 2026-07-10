import { assert } from "./internal/assert";

function isNumberString(str: string) {
  return /^\d+$/.test(str);
}

/**
 * Keys that could be used to walk up the prototype chain and pollute
 * `Object.prototype`. They are never valid form field names, so we reject them.
 */
const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);

/**
 * Whether `value` is a plain object (one we created while building the
 * structure), as opposed to a leaf value such as a `File` or `Blob`.
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function set(
  // oxlint-disable-next-line typescript/no-explicit-any
  obj: Record<string, any>,
  path: readonly string[],
  value: unknown,
): void {
  assert(path.length > 0);

  let current = obj;

  for (let index = 0; index < path.length; index++) {
    const key = path[index];
    assert(key != null);

    if (FORBIDDEN_KEYS.has(key)) {
      throw new Error(`Unsafe form data key "${key}" is not allowed`);
    }

    if (index < path.length - 1) {
      const nextKey = path[index + 1];
      assert(nextKey != null);

      if (current[key] === undefined) {
        current[key] = isNumberString(nextKey) ? [] : {};
      } else if (Array.isArray(current[key]) && !isNumberString(nextKey)) {
        current[key] = Object.fromEntries(Object.entries(current[key]));
      } else if (!Array.isArray(current[key]) && !isPlainObject(current[key])) {
        throw new Error(
          `Conflicting form data key "${path.slice(index).join(".")}": "${key}" is already a value`,
        );
      }

      current = current[key];
      continue;
    }

    if (current[key] === undefined) {
      current[key] = value;
    } else if (Array.isArray(current[key])) {
      current[key].push(value);
    } else if (isPlainObject(current[key])) {
      throw new Error(
        `Conflicting form data key "${key}": already holds a nested object`,
      );
    } else {
      current[key] = [current[key], value];
    }
  }
}

/**
 * Converts FormData to a structured JavaScript object
 *
 * This function parses FormData entries and converts them into a nested object structure.
 * It supports dot notation, array notation, and mixed nested structures.
 *
 * @param formData - The FormData object to convert
 * @returns A structured object representing the form data
 *
 * @example
 * Basic usage:
 * ```ts
 * const formData = new FormData();
 * formData.append('name', 'John');
 * formData.append('email', 'john@example.com');
 *
 * const result = formDataToObject(formData);
 * // Result: { name: 'John', email: 'john@example.com' }
 * ```
 *
 * @example
 * Nested objects with dot notation:
 * ```ts
 * const formData = new FormData();
 * formData.append('user.name', 'John');
 * formData.append('user.profile.age', '30');
 *
 * const result = formDataToObject(formData);
 * // Result: { user: { name: 'John', profile: { age: '30' } } }
 * ```
 *
 * @example
 * Arrays with bracket notation:
 * ```ts
 * const formData = new FormData();
 * formData.append('items[0]', 'apple');
 * formData.append('items[1]', 'banana');
 *
 * const result = formDataToObject(formData);
 * // Result: { items: ['apple', 'banana'] }
 * ```
 *
 * @example
 * Multiple values for the same key:
 * ```ts
 * const formData = new FormData();
 * formData.append('tags', 'javascript');
 * formData.append('tags', 'typescript');
 *
 * const result = formDataToObject(formData);
 * // Result: { tags: ['javascript', 'typescript'] }
 * ```
 *
 * @example
 * Mixed nested structures:
 * ```ts
 * const formData = new FormData();
 * formData.append('users[0].name', 'John');
 * formData.append('users[0].emails[0]', 'john@work.com');
 * formData.append('users[0].emails[1]', 'john@personal.com');
 *
 * const result = formDataToObject(formData);
 * // Result: {
 * //   users: [{
 * //     name: 'John',
 * //     emails: ['john@work.com', 'john@personal.com']
 * //   }]
 * // }
 * ```
 */
export function formDataToObject(formData: FormData) {
  const obj: Record<string, unknown> = {};

  for (const [key, value] of formData.entries()) {
    const parts = key.split(/[.[\]]/).filter(Boolean);
    set(obj, parts, value);
  }

  return obj;
}
