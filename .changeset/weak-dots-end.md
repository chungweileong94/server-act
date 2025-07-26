---
"server-act": patch
---

### ✨ Refactored `stateAction` and reintroduced `formAction` (deprecated)

This update improves the developer experience when working with `stateAction`, aligning it more closely with modern React conventions and removing legacy form-related naming. Please refer to this [PR](https://github.com/chungweileong94/server-act/pull/47) for more details.

#### Breaking Changes

- `formAction` has been officially deprecated in favor of `stateAction`.
- Inside `stateAction`:
  - `formData` → `rawInput`
  - `formErrors` → `inputErrors`
- The input type now infers directly from the schema instead of defaulting to `FormData`.

#### New Utility

- Introduced `formDataToObject`, a new utility inspired by [tRPC](https://trpc.io), to help transition from `zod-form-data`:
  ```ts
  function zodFormData<T extends z.ZodType>(
    schema: T,
  ): z.ZodPipe<z.ZodTransform<Record<string, unknown>, FormData>, T> {
    return z.preprocess((v) => formDataToObject(v), schema);
  }
