'use server';

import {serverAct} from 'server-act';
import {z} from 'zod';

const requestTimeMiddleware = () => {
  return {
    requestTime: new Date(),
  };
};

export const sayHelloAction = serverAct
  .middleware(requestTimeMiddleware)
  .input(
    z.object({
      name: z.string().optional(),
    }),
  )
  .action(async ({input, ctx}) => {
    console.log(`Someone say hi from the client at ${ctx.requestTime.toTimeString()}!`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return input.name ? `Hello, ${input.name}!` : 'You need to tell me your name!';
  });
