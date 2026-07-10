---
"server-act": patch
---

Process nested `FormData` field paths iteratively instead of recursively. This avoids allocating a sliced path at every nesting level, improves deeply nested form parsing performance, and prevents call stack overflows for unusually deep field names.
