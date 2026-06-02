import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4">
      <Link href="/action">👉 Action Example</Link>
      <Link href="/state-action">👉 State Action Example</Link>
    </main>
  );
}
