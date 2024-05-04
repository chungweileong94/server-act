"use server";

import { serverAct } from "server-act";
import { z } from "zod";
import { zfd } from "zod-form-data";

const requestTimeMiddleware = () => {
  return {
    requestTime: new Date(),
  };
};

export const sayHelloAction = serverAct
  .middleware(requestTimeMiddleware)
  .input(
    zfd.formData({
      name: zfd.text(
        z
          .string({ required_error: `You haven't told me your name` })
          .nonempty({ message: "You need to tell me your name!" }),
      ),
    }),
  )
  .formAction(async ({ input, formErrors, ctx }) => {
    if (formErrors) {
      return { formErrors: formErrors.formErrors.fieldErrors };
    }

    console.log(
      `Someone say hi from the client at ${ctx.requestTime.toTimeString()}!`,
    );
    await new Promise((resolve) => setTimeout(resolve, 1000));

    return { message: `Hello, ${input.name}!` };
  });
