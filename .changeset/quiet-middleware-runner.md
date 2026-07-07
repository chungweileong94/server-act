---
"server-act": patch
---

Precompile middleware runners when actions are created and skip middleware execution machinery for actions without middleware. This reduces per-call overhead while preserving existing middleware behavior.
