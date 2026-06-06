# Server-Act

[![npm version](https://badge.fury.io/js/server-act.svg)](https://badge.fury.io/js/server-act)

A simple React server action builder that provides input validation.

You can use any validation library that supports [Standard Schema](https://standardschema.dev/).

## Installation

```bash
# npm
npm install server-act zod

# yarn
yarn add server-act zod

# pnpm
pnpm add server-act zod
```

## Usage

```ts
// action.ts
"use server";

import { serverAct } from "server-act";
import { z } from "zod";

export const sayHelloAction = serverAct
  .input(
    z.object({
      name: z.string(),
    }),
  )
  .action(async ({ input }) => {
    return `Hello, ${input.name}`;
  });
```

```tsx
// client-component.tsx
"use client";

import { sayHelloAction } from "./action";

export const ClientComponent = () => {
  const onClick = () => {
    const message = await sayHelloAction({ name: "John" });
    console.log(message); // Hello, John
  };

  return (
    <div>
      <button onClick={onClick}>Trigger action</button>
    </div>
  );
};
```

### With Middleware

```ts
// action.ts
"use server";

import { serverAct } from "server-act";
import { z } from "zod";

export const sayHelloAction = serverAct
  .use(({ next }) => {
    const t = i18n();
    const userId = "...";
    return next({ ctx: { t, userId } });
  })
  .input(({ ctx }) => {
    return z.object({
      name: z.string().min(1, { message: ctx.t("form.name.required") }),
    });
  })
  .action(async ({ ctx, input }) => {
    console.log("User ID", ctx.userId);
    return `Hello, ${input.name}`;
  });
```

#### Chaining Middlewares

You can chain multiple middlewares by calling `.use(...)` repeatedly.

- Middlewares run in registration order.
- Each middleware receives the current `ctx` and forwards additions with `next({ ctx })`.
- `next()` can be called without params when nothing needs to be added.
- `next({ ctx })` shallow-merges the provided keys into the current context.
- Later middleware values override earlier values for the same key.
- Errors thrown in middleware propagate and stop later middleware from running.

```ts
// action.ts
"use server";

import { serverAct } from "server-act";

export const createGreetingAction = serverAct
  .use(({ next }) =>
    next({
      ctx: {
        requestId: crypto.randomUUID(),
        role: "user",
      },
    }),
  )
  .use(({ ctx, next }) =>
    next({
      ctx: {
        role: "admin", // overrides previous role
        actorLabel: `${ctx.role}-actor`,
      },
    }),
  )
  .use(({ ctx, next }) =>
    next({
      ctx: {
        trace: `${ctx.requestId}:${ctx.actorLabel}`,
      },
    }),
  )
  .action(async ({ ctx }) => {
    return `${ctx.role} -> ${ctx.trace}`;
  });
```

#### Migrating From `.middleware()`

`.middleware()` is still supported for backward compatibility, but it is deprecated in favor of `.use()`.

```ts
const legacyAction = serverAct.middleware(({ ctx }) => ({
  user: getUser(),
}));

const nextStyleAction = serverAct.use(({ ctx, next }) =>
  next({
    ctx: {
      user: getUser(),
    },
  }),
);
```

#### Reusable Middleware

Use `createServerActMiddleware` to define middleware once and reuse it across actions.

```ts
import { createServerActMiddleware, serverAct } from "server-act";

const requestIdMiddleware = createServerActMiddleware(({ next }) =>
  next({ ctx: { requestId: crypto.randomUUID() } }),
);

const traceMiddleware = createServerActMiddleware(({ ctx, next }) =>
  next({ ctx: { trace: `${ctx.requestId}-trace` } }),
);

export const action = serverAct
  .use(requestIdMiddleware)
  .use(traceMiddleware)
  .action(async ({ ctx }) => `${ctx.requestId}:${ctx.trace}`);
```

### `useActionState` Support

> `useActionState` Documentation:
>
> - https://react.dev/reference/react/useActionState

```ts
// action.ts;
"use server";

import { serverAct } from "server-act";
import { formDataToObject } from "server-act/utils";
import { z } from "zod";

function zodFormData<T extends z.ZodType>(schema: T) {
  return z.preprocess<Record<string, unknown>, T, FormData>(
    (v) => formDataToObject(v),
    schema,
  );
}

export const sayHelloAction = serverAct
  .input(
    zodFormData(
      z.object({
        name: z
          .string()
          .min(1, { error: `You haven't told me your name` })
          .max(20, { error: "Any shorter name? You name is too long 😬" }),
      }),
    ),
  )
  .stateAction(async ({ rawInput, input, inputErrors, ctx }) => {
    if (inputErrors) {
      return {
        rawInput,
        nameErrors: inputErrors.fieldErrors["name"],
        inputErrors: inputErrors.fieldErrors,
      };
    }
    return { message: `Hello, ${input.name}!` };
  });
```

`inputErrors.fieldErrors` uses flat dot-path keys. The canonical way to read them is bracket access like `fieldErrors["name"]` or `fieldErrors["list.0.foo"]`.

#### Overriding `inputErrorShape`

By default, `stateAction` infers `inputErrors.fieldErrors` from the schema output type. That is usually what you want because it matches the parsed `input`.

Sometimes that is not the right source of truth for your UI though. The common case is a schema that transforms flat form fields into a different parsed shape. In those cases, you can override the error-path source with the second generic on `.input()`.

```ts
const signupSchema = zodFormData(
  z.object({
    firstName: z
      .string()
      .min(1, { error: "First name is required" })
      .max(20, { error: "First name is too long" }),
    lastName: z
      .string()
      .min(1, { error: "Last name is required" })
      .max(20, { error: "Last name is too long" }),
  }),
);

const signupSchemaWithTransform = signupSchema.transform(
  ({ firstName, lastName }) => ({
    profile: {
      fullName: `${firstName} ${lastName}`,
    },
  }),
);

export const saveProfileAction = serverAct
  .input<
    typeof signupSchemaWithTransform,
    z.output<typeof signupSchema>
  >(signupSchemaWithTransform)
  .stateAction(async ({ input, inputErrors }) => {
    if (inputErrors) {
      return {
        firstNameErrors: inputErrors.fieldErrors["firstName"],
        lastNameErrors: inputErrors.fieldErrors["lastName"],
      };
    }

    return {
      message: `Saved ${input.profile.fullName}`,
    };
  });
```

In that example:

- the submitted fields are `firstName` and `lastName`
- the parsed `input` is transformed into `{ profile: { fullName: string } }`
- `rawInput` is still inferred from the schema input type
- `input` is still inferred from the schema output type
- only `inputErrors.fieldErrors` changes, so it uses `"firstName"` and `"lastName"` keys instead of the transformed output shape

Use this override when your validation schema and your form/error addressing model intentionally differ.

## Utilities

### `formDataToObject`

The `formDataToObject` utility converts FormData to a structured JavaScript object, supporting nested objects, arrays, and complex form structures.

```ts
import { formDataToObject } from "server-act/utils";
```

#### Basic Usage

```ts
const formData = new FormData();
formData.append("name", "John");

const result = formDataToObject(formData);
// Result: { name: 'John' }
```

#### Nested Objects and Arrays

```ts
const formData = new FormData();
formData.append("user.name", "John");

const result = formDataToObject(formData);
// Result: { user: { name: 'John' } }
```

#### With Zod

```ts
"use server";

import { serverAct } from "server-act";
import { formDataToObject } from "server-act/utils";
import { z } from "zod";

function zodFormData<T extends z.ZodType>(schema: T) {
  return z.preprocess<Record<string, unknown>, T, FormData>(
    (v) => formDataToObject(v),
    schema,
  );
}

export const createUserAction = serverAct
  .input(
    zodFormData(
      z.object({
        name: z.string().min(1, "Name is required"),
      }),
    ),
  )
  .stateAction(async ({ rawInput, input, inputErrors }) => {
    if (inputErrors) {
      return { rawInput, inputErrors: inputErrors.fieldErrors };
    }

    // Process the validated input
    console.log("User:", input.name);

    return { success: true, userId: "123" };
  });
```

#### With Valibot

```ts
"use server";

import { serverAct } from "server-act";
import { formDataToObject } from "server-act/utils";
import * as v from "valibot";

export const createPostAction = serverAct
  .input(
    v.pipe(
      v.custom<FormData>((value) => value instanceof FormData),
      v.transform(formDataToObject),
      v.object({
        title: v.pipe(v.string(), v.minLength(1, "Title is required")),
      }),
    ),
  )
  .stateAction(async ({ rawInput, input, inputErrors }) => {
    if (inputErrors) {
      return { rawInput, inputErrors: inputErrors.fieldErrors };
    }

    // Process the validated input
    console.log("Post:", input.title);

    return { success: true, postId: "456" };
  });
```
