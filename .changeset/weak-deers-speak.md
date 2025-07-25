---
"server-act": minor
---

- `.formAction` has been renamed to `.stateAction`.

If you are using `.formAction`, you must update all references to `.stateAction`:

```diff
- const action = serverAct.formAction(...)
+ const action = serverAct.stateAction(...)
```
