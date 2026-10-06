import type { Metadata } from "next";
import "./globals.css";

// Central metadata keeps the portfolio project presentation polished from day one.
export const metadata: Metadata = {
  title: "Housing + Rent Trends Dashboard",
  description:
    "Compare annual Census ACS rent, home value, income, and housing vacancy estimates across four U.S. metro areas."
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
