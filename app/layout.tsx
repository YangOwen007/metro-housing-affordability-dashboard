import type { Metadata } from "next";
import "./globals.css";

// Central metadata keeps the portfolio project presentation polished from day one.
export const metadata: Metadata = {
  title: "Housing + Rent Trends Dashboard",
  description:
    "An internship-ready data dashboard that turns public housing, rent, and macroeconomic data into visual analytics."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
