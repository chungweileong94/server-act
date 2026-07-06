---
"server-act": patch
---

Fix a prototype pollution vulnerability in `formDataToObject`. Form data keys such as `__proto__`, `constructor`, and `prototype` are now rejected instead of being written onto the object prototype.

`formDataToObject` also no longer silently drops values on ambiguous key collisions. Descending into a key that already holds a scalar/`File` value, or overwriting a nested object with a scalar, now throws a descriptive error. Multiple files uploaded under the same key still collapse into an array.
