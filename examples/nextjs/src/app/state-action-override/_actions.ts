"use server";

import {
  createServerActMiddleware,
  serverAct,
  type InputErrors,
} from "server-act";
import { formDataToObject } from "server-act/utils";
import { z } from "zod";

function zodFormData<T extends z.ZodType>(schema: T) {
  return z.preprocess<Record<string, unknown>, T, FormData>(
    (v) => formDataToObject(v),
    schema,
  );
}

const requestTimeMiddleware = createServerActMiddleware(({ next }) =>
  next({
    ctx: {
      requestTime: new Date(),
    },
  }),
);

const signupSchema = zodFormData(
  z.object({
    firstName: z
      .string()
      .min(1, { error: "First name is required" })
      .max(20, { error: "First name is too long" }),
    lastName: z
      .string()
      .min(1, { error: "Last name is required" })
      .max(20, { error: "Last name is too long" }),
  }),
);

const signupSchemaWithTransform = signupSchema.transform(
  ({ firstName, lastName }) => ({
    profile: {
      fullName: `${firstName} ${lastName}`,
    },
  }),
);

type SignupState =
  | {
      rawInput: FormData;
      inputErrors: InputErrors<{
        firstName: string;
        lastName: string;
      }>["fieldErrors"];
    }
  | {
      message: string;
    };

export const sayHelloOverrideAction = serverAct
  .use(requestTimeMiddleware)
  .input<typeof signupSchemaWithTransform, z.output<typeof signupSchema>>(
    signupSchemaWithTransform,
  )
  .stateAction<SignupState>(async ({ rawInput, input, inputErrors, ctx }) => {
    if (inputErrors) {
      return {
        rawInput,
        inputErrors: inputErrors.fieldErrors,
      };
    }

    console.info(
      `Someone say hi from the client at ${ctx.requestTime.toTimeString()}!`,
    );
    await new Promise((resolve) => setTimeout(resolve, 1000));

    return { message: `Hello, ${input.profile.fullName}!` };
  });
