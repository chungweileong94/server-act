---
"server-act": patch
---

`.use()` middlewares now wrap the full execution chain, so calling `next()` continues through the remaining middlewares and then into the final action. This allows reusable middleware to measure full action duration, observe downstream errors, and participate in end-to-end control flow.

At the type level, `.use()` now requires returning the result of `next()`, which helps prevent accidentally returning arbitrary values from middleware.
