"use client";

import { useState, useTransition } from "react";

import { sayHelloAction } from "./actions";

export default function Action() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string>();

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const msg = await sayHelloAction({
        name: formData.get("name")?.toString(),
      });
      setMessage(msg);
    });
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <form
        onSubmit={onSubmit}
        className="flex w-full flex-col items-stretch justify-stretch gap-2 md:w-80"
      >
        <label htmlFor="name">Please tell us your name</label>
        <input
          id="name"
          name="name"
          className="rounded-md border-2 border-black px-4 py-2"
        />
        <button
          type="submit"
          className=" rounded-md border-2 border-black bg-red-100 px-4 py-2"
          disabled={pending}
        >
          {pending ? "Loading..." : "Say hello to the server"}
        </button>
        {!!message && <p className="text-gray-500">{message}</p>}
      </form>
    </main>
  );
}
