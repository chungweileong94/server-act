'use client';

import {experimental_useFormStatus as useFormStatus, experimental_useFormState as useFormState} from 'react-dom';

import {sayHelloAction} from './actions';

// FIXME: Remove this once the official types release
declare module 'react-dom' {
  function experimental_useFormState<S, P>(
    action: (state: S, payload: P) => Promise<S>,
    initialState?: S,
    url?: string,
  ): [S | undefined, (payload: P) => Promise<void>];
}

function SubmitButton() {
  const status = useFormStatus();
  return (
    <button type="submit" className=" rounded-md border-2 border-black bg-red-100 px-4 py-2" disabled={status.pending}>
      {status.pending ? 'Loading...' : 'Say hello to the server'}
    </button>
  );
}

export default function FormAction() {
  const [state, dispatch] = useFormState(sayHelloAction);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <form action={dispatch} className="flex w-full flex-col items-stretch justify-stretch gap-2 md:w-80">
        <label htmlFor="name">Please tell us your name</label>
        <input id="name" name="name" className="rounded-md border-2 border-black px-4 py-2" />
        <SubmitButton />
        {!!state?.success && <p className="text-gray-500">{state.message}</p>}
        {!state?.success &&
          state?.formErrors?.name?.map((error) => (
            <p key={error} className="text-red-500">
              {error}
            </p>
          ))}
      </form>
    </main>
  );
}
