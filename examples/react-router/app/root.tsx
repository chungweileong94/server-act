import { Links, Meta, Outlet, ScrollRestoration } from "react-router";
import "./app.css";

export function meta() {
  return [{ title: "Server-Act with React Router" }];
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <header className="fixed inset-x-0 top-0 z-10 border-b border-gray-200 bg-white px-6 py-3 text-sm text-gray-500">
          server-act with React Router
        </header>
        {children}
        <ScrollRestoration />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}
