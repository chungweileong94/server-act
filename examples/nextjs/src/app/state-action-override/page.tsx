"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { sayHelloOverrideAction } from "./_actions";

function SubmitButton() {
  const status = useFormStatus();
  return (
    <button
      type="submit"
      className="rounded-md border-2 border-black bg-red-100 px-4 py-2"
      disabled={status.pending}
    >
      {status.pending ? "Loading..." : "Say hello with transformed input"}
    </button>
  );
}

export default function StateActionOverridePage() {
  const [state, dispatch] = useActionState(sayHelloOverrideAction, undefined);
  const firstName =
    state && "rawInput" in state
      ? state.rawInput.get("firstName")?.toString()
      : undefined;
  const lastName =
    state && "rawInput" in state
      ? state.rawInput.get("lastName")?.toString()
      : undefined;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <form
        action={dispatch}
        className="flex w-full flex-col items-stretch justify-stretch gap-2 md:w-80"
      >
        <p className="text-sm text-gray-500">
          This example transforms `firstName` and `lastName` into
          `input.profile.fullName`, while keeping `inputErrors` keyed by the
          original form fields.
        </p>
        <label htmlFor="firstName">First name</label>
        <input
          id="firstName"
          name="firstName"
          className="rounded-md border-2 border-black px-4 py-2"
          defaultValue={firstName}
        />
        {state &&
          "inputErrors" in state &&
          state.inputErrors.firstName?.map((error: string) => (
            <p key={error} className="text-red-500">
              {error}
            </p>
          ))}
        <label htmlFor="lastName">Last name</label>
        <input
          id="lastName"
          name="lastName"
          className="rounded-md border-2 border-black px-4 py-2"
          defaultValue={lastName}
        />
        {state &&
          "inputErrors" in state &&
          state.inputErrors.lastName?.map((error: string) => (
            <p key={error} className="text-red-500">
              {error}
            </p>
          ))}
        <SubmitButton />
        {state && "message" in state && (
          <p className="text-gray-500">{state.message}</p>
        )}
      </form>
    </main>
  );
}
