# server-act

## 1.5.2

### Patch Changes

- [`7f3e2d7`](https://github.com/chungweileong94/server-act/commit/7f3e2d7863cef4c25ad9088ef54a09d459d241f7) Thanks [@chungweileong94](https://github.com/chungweileong94)! - Update peer dependencies to support Zod v4

## 1.5.1

### Patch Changes

- [#39](https://github.com/chungweileong94/server-act/pull/39) [`764a047`](https://github.com/chungweileong94/server-act/commit/764a047670daa43d978bcb5d77f0b285c38da25f) Thanks [@chungweileong94](https://github.com/chungweileong94)! - Support `prevState` typing

## 1.5.0

### Minor Changes

- [#37](https://github.com/chungweileong94/server-act/pull/37) [`b4e65ee`](https://github.com/chungweileong94/server-act/commit/b4e65eea8812d6c57a142fd67bbc5d1ec011e892) Thanks [@chungweileong94](https://github.com/chungweileong94)! - Support [Standard Schema](https://standardschema.dev/)!

  You can now use any validation library that supports Standard Schema.

  Breaking changes:

  - Minimum required version of Zod is now `^3.24.0`.
  - `formErrors` in `formAction` will now return `{ messages: string[]; fieldErrors: Record<string, string[]> }` instead of `ZodError`.
  - You can no longer use an object as input if you are using `zfd.formData` from `zod-form-data`.

## 1.4.0

### Minor Changes

- [#35](https://github.com/chungweileong94/server-act/pull/35) [`113557d`](https://github.com/chungweileong94/server-act/commit/113557dd85e9a92a4d175cd74d87906a17296120) Thanks [@chungweileong94](https://github.com/chungweileong94)! - Improved input type infer

## 1.3.1

### Patch Changes

- [`2854c03`](https://github.com/chungweileong94/server-act/commit/2854c0332a752aeea8a958d0fdde0283a22e0c78) Thanks [@chungweileong94](https://github.com/chungweileong94)! - Fixed async context access from `.input()`

## 1.3.0

### Minor Changes

- [#30](https://github.com/chungweileong94/server-act/pull/30) [`7288143`](https://github.com/chungweileong94/server-act/commit/7288143f7f9a4dff39613569af2fb6c439eea097) Thanks [@chungweileong94](https://github.com/chungweileong94)! - Support middleware ctx access in `.input()`

## 1.2.2

### Patch Changes

- [#27](https://github.com/chungweileong94/server-act/pull/27) [`2ab472c`](https://github.com/chungweileong94/server-act/commit/2ab472cda8d404406a7ddeec4645e012c81abcd9) Thanks [@chungweileong94](https://github.com/chungweileong94)! - Prevent duplicate chaining methods

## 1.2.1

### Patch Changes

- [#24](https://github.com/chungweileong94/server-act/pull/24) [`c9decae`](https://github.com/chungweileong94/server-act/commit/c9decaec540e3824a10738282bb71775d3cfce04) Thanks [@rvndev](https://github.com/rvndev)! - Enables zod refinments in input validation

## 1.2.0

### Minor Changes

- [#22](https://github.com/chungweileong94/server-act/pull/22) [`a71e8ba`](https://github.com/chungweileong94/server-act/commit/a71e8ba1131b226ad3acc58b8b8f3dc91f759d77) Thanks [@chungweileong94](https://github.com/chungweileong94)! - Better React 19 support

  - Updated `useFormState` example to `useActionState`.
  - `prevState` from form action is now `undefined` type by default.
  - You can now access `formData` in form action.

## 1.1.7

### Patch Changes

- [#20](https://github.com/chungweileong94/server-act/pull/20) [`7f92a29`](https://github.com/chungweileong94/server-act/commit/7f92a29a19f308f174b405365fd2633c06c9b686) Thanks [@chungweileong94](https://github.com/chungweileong94)! - Support async validation

## 1.1.6

### Patch Changes

- [#18](https://github.com/chungweileong94/server-act/pull/18) [`b1cbc4a`](https://github.com/chungweileong94/server-act/commit/b1cbc4a3ba62d3613d8ada41794c900676e9636b) Thanks [@chungweileong94](https://github.com/chungweileong94)! - Improve action optional param type

## 1.1.5

### Patch Changes

- [`0782a06`](https://github.com/chungweileong94/server-act/commit/0782a0626045823344048fbc00652144f6f14eca) Thanks [@chungweileong94](https://github.com/chungweileong94)! - Fixed README

## 1.1.4

### Patch Changes

- [`4201412`](https://github.com/chungweileong94/server-act/commit/4201412c2d22afb69f9c640d23bad76102ae8285) Thanks [@chungweileong94](https://github.com/chungweileong94)! - Refactor types

## 1.1.3

### Patch Changes

- [#14](https://github.com/chungweileong94/server-act/pull/14) [`8bb348e`](https://github.com/chungweileong94/server-act/commit/8bb348ee0ed7a60a2498a37cab86c7271c205752) Thanks [@chungweileong94](https://github.com/chungweileong94)! - Remove `zod-validation-error` dependency

## 1.1.2

### Patch Changes

- a832b11: Improve form errors type infer

## 1.1.1

### Patch Changes

- 8d5b6e5: Fixed zod error type in `formAction` when using FormData

## 1.1.0

### Minor Changes

- 48b9164: Remove formData parsing for `formAction`

## 1.0.0

### Major Changes

- b4318a8: Get `formAction` out of experimental!

## 0.0.10

### Patch Changes

- a2ab457: Fixed form action doc

## 0.0.9

### Patch Changes

- d8682f2: Documentation for experimental form action

## 0.0.8

### Patch Changes

- 566261e: Change form action error to ZodError
- ead7149: Prettify form action params type

## 0.0.7

### Patch Changes

- 50e2853: New experimental form action

## 0.0.6

### Patch Changes

- fedd1d4: Update README

## 0.0.5

### Patch Changes

- 7e5d9c9: Support middleware

## 0.0.1

### Patch Changes

- 01d52a7: First Release!

## 0.0.1

### Patch Changes

- First Release!
