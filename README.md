# Server-Act

![npm](https://img.shields.io/npm/v/server-act)

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

### _(Experimental)_ `useFormState` Support

> `useFormState` Documentation: https://nextjs.org/docs/app/building-your-application/data-fetching/forms-and-mutations#error-handling

```ts
// action.ts;
"use server";

import { serverAct } from "server-act";

export const sayHelloAction = serverAct
  .middleware(requestTimeMiddleware)
  .input(
    z.object({
      name: z
        .string({ required_error: `You haven't told me your name` })
        .nonempty({ message: "You need to tell me your name!" }),
    })
  )
  .experimental_formAction(async ({ input, formErrors, ctx }) => {
    if (formErrors) {
      return {
        success: false as const,
        formErrors: formErrors.formErrors.fieldErrors,
      };
    }
    return {
      success: true as const,
      message: `Hello, ${input.name}!`,
    };
  });
```

```tsx
// client-component.tsx
"use client";

import { sayHelloAction } from "./action";

export const ClientComponent = () => {
  const [state, dispatch] = useFormState(sayHelloAction);

  return (
    <form action={dispatch}>
      <input name="name" required />
      {state?.formErrors?.name?.map((error) => <p key={error}>{error}</p>)}

      <button type="submit">Submit</button>

      {!!state?.success && <p>{state.message}</p>}
    </form>
  );
};
```
