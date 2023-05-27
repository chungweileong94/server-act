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

const sayHelloAction = serverAct
  .input(
    z.object({
      name: z.string(),
    })
  )
  .action(async ({ name }) => {
    return `Hello, ${name}`;
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
