'use server';

import {serverAct} from 'server-act';
import {z} from 'zod';

export const sayHelloAction = serverAct
  .input(
    z.object({
      name: z.string().optional(),
    }),
  )
  .action(async ({input}) => {
    console.log('Someone say hi from the client!');
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return input.name ? `Hello, ${input.name}!` : 'You need to tell me your name!';
  });
