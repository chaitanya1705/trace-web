import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./responsive.css";

export const metadata: Metadata = {
  title: "TRACE",
  description:
    "TRACE is the debugging assistant for production incidents. It investigates your changes, code and telemetry, tests competing explanations, and tells you what remains unknown.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

/* Applies the saved theme before first paint so the page never flashes the wrong palette. */
const themeBoot = `try{var t=localStorage.getItem('trace_theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,300..700&family=JetBrains+Mono:wght@400;500&display=swap"
        />
        <script dangerouslySetInnerHTML={{ __html: themeBoot }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
