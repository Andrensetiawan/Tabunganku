import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TabunganKu",
  description: "Dashboard tabungan dan transaksi",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
