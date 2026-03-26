---
"server-act": minor
---

🎉 New `.use()` middleware API that forwards context through `next()`. Also added a helper `createServerActMiddleware` to define reusable typed middleware.

The legacy `.middleware()` API is still supported for backward compatibility, but it is now deprecated in favor of `.use()`.
