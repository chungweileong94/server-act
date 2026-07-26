---
"server-act": patch
---

Make package creation non-destructive. Packing no longer rewrites the checked-in package manifest; published tarballs retain normal package scripts and development metadata while preserving runtime exports and dependencies.
