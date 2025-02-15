import type { StandardSchemaV1 } from "@standard-schema/spec";
import { getDotPath } from "@standard-schema/utils";

export async function standardValidate<T extends StandardSchemaV1>(
  schema: T,
  input: StandardSchemaV1.InferInput<T>,
): Promise<
  StandardSchemaV1.Result<
    StandardSchemaV1.InferOutput<T> | StandardSchemaV1.FailureResult
  >
> {
  let result = schema["~standard"].validate(input);
  if (result instanceof Promise) result = await result;
  return result;
}

export function getFormErrors(issues: ReadonlyArray<StandardSchemaV1.Issue>) {
  const messages: string[] = [];
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of issues) {
    const dotPath = getDotPath(issue);
    if (dotPath) {
      if (fieldErrors[dotPath]) {
        fieldErrors[dotPath].push(issue.message);
      } else {
        fieldErrors[dotPath] = [issue.message];
      }
    } else {
      messages.push(issue.message);
    }
  }
  return { messages, fieldErrors };
}
