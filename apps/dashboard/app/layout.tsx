import type { Metadata } from "next";
import "./globals.css";
import LayoutClient from "./layout-client";

export const metadata: Metadata = {
  title: "KlinikBot Dashboard",
  description: "Dashboard Admin KlinikBot"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>
        <LayoutClient>{children}</LayoutClient>
      </body>
    </html>
  );
}
