import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import LoadingWrapper from "./LoadingWrapper";
import { AuthProvider } from "./Context/AuthContext";
import { ToastProvider } from "@/components/ui/Toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Ournold: the watcher of your fitness", template: "%s | Ournold" },
  description:
    "AI fitness companion: personalised meal plans, workout plans with a webcam rep counter, progress tracking and a chat coach.",
  applicationName: "Ournold",
  authors: [{ name: "Aditya Godara" }],
};

export const viewport: Viewport = {
  themeColor: "#1b1b1b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <LoadingWrapper>
          <AuthProvider>
            <ToastProvider>{children}</ToastProvider>
          </AuthProvider>
        </LoadingWrapper>

      </body>
    </html>
  );
}
