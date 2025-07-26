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
import { zfd } from "zod-form-data";

function zodFormData<T extends z.ZodType>(
  schema: T,
): z.ZodPipe<z.ZodTransform<Record<string, unknown>, FormData>, T> {
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

```tsx
// client-component.tsx
"use client";

import { useActionState } from "react";
import { sayHelloAction } from "./action";

export const ClientComponent = () => {
  const [state, dispatch] = useActionState(sayHelloAction, undefined);

  return (
    <form action={dispatch}>
      <input
        name="name"
        required
        defaultValue={state?.formData?.get("name")?.toString()}
      />
      {state?.inputErrors?.name?.map((error) => <p key={error}>{error}</p>)}

      <button type="submit">Submit</button>

      {!!state?.message && <p>{state.message}</p>}
    </form>
  );
};
```
