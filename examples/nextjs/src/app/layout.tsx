import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Server-Act with Next.js",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <header className="fixed inset-x-0 top-0 z-10 border-b border-gray-200 bg-white px-6 py-3 text-sm text-gray-500">
          server-act with Next.js
        </header>
        {children}
      </body>
    </html>
  );
}
