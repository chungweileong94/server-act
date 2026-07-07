---
"server-act": patch
---

Prevent `.use()` middleware from calling `next()` more than once. Repeated calls now throw a clear error instead of re-running downstream middleware or the final action, which helps avoid accidental duplicate side effects.

The legacy `.middleware()` API is also now marked as deprecated, matching the README guidance to use `.use()`.
