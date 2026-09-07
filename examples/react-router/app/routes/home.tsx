import { Link } from "react-router";

export function ServerComponent() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4">
      <Link to="/action">👉 Action Example</Link>
      <Link to="/state-action">👉 State Action Example</Link>
      <Link to="/state-action-override">
        👉 State Action with Error Shape Override Example
      </Link>
    </main>
  );
}
