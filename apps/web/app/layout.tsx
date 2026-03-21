import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FabricLab",
  description: "FabricLab MVP",
};

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#07111f] text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}
