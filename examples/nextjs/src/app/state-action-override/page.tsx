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
      {status.pending ? "Loading..." : "Say hello"}
    </button>
  );
}

export default function StateActionOverridePage() {
  const [state, dispatch] = useActionState(sayHelloOverrideAction, undefined);
  const firstName = state?.rawInput?.get("firstName")?.toString();
  const lastName = state?.rawInput?.get("lastName")?.toString();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="mb-10 max-w-md rounded-md border-2 border-blue-400 bg-blue-100 p-2">
        <p className="text-sm text-blue-500 [&>code]:rounded-md [&>code]:bg-gray-200 [&>code]:px-1 [&>code]:text-gray-600">
          This example transforms <code>firstName</code> and{" "}
          <code>lastName</code> into <code>input.profile.fullName</code>, while
          keeping <code>inputErrors</code> keyed by the original form fields.
        </p>
      </div>
      <form
        action={dispatch}
        className="flex w-full flex-col items-stretch justify-stretch gap-2 md:w-80"
      >
        <label htmlFor="firstName">First name</label>
        <input
          id="firstName"
          name="firstName"
          className="rounded-md border-2 border-black px-4 py-2"
          defaultValue={firstName}
        />
        {state?.inputErrors?.firstName?.map((error: string) => (
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
        {state?.inputErrors?.lastName?.map((error: string) => (
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
