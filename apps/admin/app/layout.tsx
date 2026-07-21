import type { Metadata } from "next";
import { Amiri, Instrument_Sans, Sora } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import { ThemeProvider } from "@/lib/theme";
import { ConfirmProvider } from "@/components/ConfirmProvider";

const sora = Sora({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-sora" });
const instrument = Instrument_Sans({ subsets: ["latin"], variable: "--font-instrument" });
const amiri = Amiri({ subsets: ["arabic"], weight: ["400", "700"], variable: "--font-amiri" });

export const metadata: Metadata = {
  title: "Althaqalayn — Admin Console",
  description: "Content administration for the Althaqalayn Cultural Foundation.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${sora.variable} ${instrument.variable} ${amiri.variable}`}>
      <body>
        <ThemeProvider>
          <AuthProvider>
            <ConfirmProvider>{children}</ConfirmProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
