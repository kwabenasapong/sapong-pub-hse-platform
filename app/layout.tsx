import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "Sapong Publishing House",
  description: "Internal publishing platform for sermon-to-book programmes",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex h-screen bg-stone-50 text-stone-900 overflow-hidden">
        <Sidebar />
        {/* pt-12 on mobile to clear the hamburger button, none on sm+ */}
        <main className="flex-1 overflow-y-auto pt-12 sm:pt-0">
          {children}
        </main>
      </body>
    </html>
  );
}
