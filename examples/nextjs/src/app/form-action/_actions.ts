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

const requestTimeMiddleware = () => {
  return {
    requestTime: new Date(),
  };
};

export const sayHelloAction = serverAct
  .middleware(requestTimeMiddleware)
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

    console.log(
      `Someone say hi from the client at ${ctx.requestTime.toTimeString()}!`,
    );
    await new Promise((resolve) => setTimeout(resolve, 1000));

    return { message: `Hello, ${input.name}!` };
  });
