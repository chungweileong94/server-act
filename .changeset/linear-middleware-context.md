---
"server-act": patch
---

Accumulate middleware context additions on a single object per action invocation. This avoids repeatedly copying all previously added context properties as the middleware chain advances, improving performance for actions with larger middleware stacks.
