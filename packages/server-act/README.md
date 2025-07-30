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
  .middleware(() => {
    const t = i18n();
    const userId = "..."
    return { t, userId };
  })
  .input((ctx) => {
    return z.object({
      name: z.string().min(1, { message: ctx.t("form.name.required") }),
    });
  })
  .action(async ({ ctx, input }) => {
    console.log("User ID", ctx.userId);
    return `Hello, ${input.name}`;
  });
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
      return { formData: rawInput, inputErrors: inputErrors.fieldErrors };
    }
    return { message: `Hello, ${input.name}!` };
  });
```

## Utilities

### `formDataToObject`

The `formDataToObject` utility converts FormData to a structured JavaScript object, supporting nested objects, arrays, and complex form structures.

```ts
import { formDataToObject } from "server-act/utils";
```

#### Basic Usage

```ts
const formData = new FormData();
formData.append('name', 'John');

const result = formDataToObject(formData);
// Result: { name: 'John' }
```

#### Nested Objects and Arrays

```ts
const formData = new FormData();
formData.append('user.name', 'John');

const result = formDataToObject(formData);
// Result: { user: { name: 'John' } }
```

#### With Zod

```ts
"use server";

import { serverAct } from "server-act";
import { formDataToObject } from "server-act/utils";
import { z } from "zod";

function zodFormData<T extends z.ZodType>(
  schema: T,
): z.ZodPipe<z.ZodTransform<Record<string, unknown>, FormData>, T> {
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
      return { formData: rawInput, errors: inputErrors.fieldErrors };
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
      return { formData: rawInput, errors: inputErrors.fieldErrors };
    }

    // Process the validated input
    console.log("Post:", input.title);

    return { success: true, postId: "456" };
  });
```
