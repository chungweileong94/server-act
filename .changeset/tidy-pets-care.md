---
"server-act": patch
---

Improve `stateAction` input error typing by inferring dot-path `fieldErrors` from the schema output shape.

Add an `inputErrorShape` override via `.input<TSchema, TInputErrorShape>(...)` for cases where the UI error paths intentionally differ from the parsed schema output.
