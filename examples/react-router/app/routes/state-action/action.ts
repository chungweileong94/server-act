"use server";

import "server-only";
import { createServerActMiddleware, serverAct } from "server-act";
import { formDataToObject } from "server-act/utils";
import { z } from "zod";

function zodFormData<T extends z.ZodType>(schema: T) {
  return z.preprocess<Record<string, unknown>, T, FormData>(
    formDataToObject,
    schema,
  );
}

const schema = zodFormData(
  z.object({
    name: z
      .string()
      .min(1, { error: "You haven't told me your name" })
      .max(20, { error: "Any shorter name? You name is too long 😬" }),
  }),
);

const requestTimeMiddleware = createServerActMiddleware(({ next }) =>
  next({
    ctx: {
      requestTime: new Date(),
    },
  }),
);

export const sayHelloStateAction = serverAct
  .use(requestTimeMiddleware)
  .input(schema)
  .stateAction(async ({ rawInput, input, inputErrors, ctx }) => {
    if (inputErrors) {
      return {
        rawInput: formDataToObject(rawInput),
        inputErrors: inputErrors.fieldErrors,
      };
    }

    console.info(
      `Someone say hi from the client at ${ctx.requestTime.toTimeString()}!`,
    );
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return { message: `Hello, ${input.name}!` };
  });
