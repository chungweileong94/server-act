# Server-Act

[![npm version](https://badge.fury.io/js/server-act.svg)](https://badge.fury.io/js/server-act)

A simple React server action builder that provides input validation with zod.

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
    })
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
    const userId = "...";
    return { userId };
  })
  .input(
    z.object({
      name: z.string(),
    })
  )
  .action(async ({ ctx, input }) => {
    console.log("User ID", ctx.userId);
    return `Hello, ${input.name}`;
  });
```

### `useFormState` Support

> `useFormState` Documentation:
>
> - https://nextjs.org/docs/app/building-your-application/data-fetching/forms-and-mutations#error-handling
> - https://react.dev/reference/react-dom/hooks/useFormState

We recommend using [zod-form-data](https://www.npmjs.com/package/zod-form-data) for input validation.

```ts
// action.ts;
"use server";

import { serverAct } from "server-act";
import { z } from "zod";
import { zfd } from "zod-form-data";

export const sayHelloAction = serverAct
  .input(
    zfd.formData({
      name: zfd.text(
        z
          .string({ required_error: `You haven't told me your name` })
          .nonempty({ message: "You need to tell me your name!" })
      ),
    })
  )
  .formAction(async ({ input, formErrors, ctx }) => {
    if (formErrors) {
      return { formErrors: formErrors.formErrors.fieldErrors };
    }
    return { message: `Hello, ${input.name}!` };
  });
```

```tsx
// client-component.tsx
"use client";

import { sayHelloAction } from "./action";

export const ClientComponent = () => {
  const [state, dispatch] = useFormState(sayHelloAction, { formErrors: {} });

  return (
    <form action={dispatch}>
      <input name="name" required />
      {state.formErrors?.name?.map((error) => <p key={error}>{error}</p>)}

      <button type="submit">Submit</button>

      {!!state.message && <p>{state.message}</p>}
    </form>
  );
};
```
