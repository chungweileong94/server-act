---
"server-act": patch
---

Accumulate middleware context additions on a single object per action invocation. This avoids repeatedly copying all previously added context properties as the middleware chain advances, improving performance for actions with larger middleware stacks.

Middleware within one invocation now shares the same context object, so downstream context additions are visible after `await next()` returns. Separate action invocations continue to use isolated context objects.
