import { assert } from "./internal/assert";

function isNumberString(str: string) {
  return /^\d+$/.test(str);
}

function set(
  // biome-ignore lint/suspicious/noExplicitAny: No worries
  obj: Record<string, any>,
  path: readonly string[],
  value: unknown,
): void {
  if (path.length > 1) {
    const newPath = [...path];
    const key = newPath.shift();
    assert(key != null);
    const nextKey = newPath[0];
    assert(nextKey != null);

    if (!obj[key]) {
      obj[key] = isNumberString(nextKey) ? [] : {};
    } else if (Array.isArray(obj[key]) && !isNumberString(nextKey)) {
      obj[key] = Object.fromEntries(Object.entries(obj[key]));
    }

    set(obj[key], newPath, value);

    return;
  }
  const p = path[0];
  assert(p != null);
  if (obj[p] === undefined) {
    obj[p] = value;
  } else if (Array.isArray(obj[p])) {
    obj[p].push(value);
  } else {
    obj[p] = [obj[p], value];
  }
}

export function formDataToObject(formData: FormData) {
  const obj: Record<string, unknown> = {};

  for (const [key, value] of formData.entries()) {
    const parts = key.split(/[\.\[\]]/).filter(Boolean);
    set(obj, parts, value);
  }

  return obj;
}
