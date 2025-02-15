---
"server-act": minor
---

Support [Standard Schema](https://standardschema.dev/)!

You can now use any validation library that supports Standard Schema.

Breaking changes:

- Minimum required version of Zod is now `^3.24.0`.
- `formErrors` in `formAction` will now return `{ messages: string[]; fieldErrors: Record<string, string[]> }` instead of `ZodError`.
