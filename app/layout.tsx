import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Full Sky Technologies CRM",
  description: "Client management, segmentation, email campaigns, and prospecting for veterinary and medical practices.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
