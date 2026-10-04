import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "music_cherry — Player",
  description:
    "A local-first music player with artwork-driven colour, tone controls and a searchable library.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f4f7" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0f" },
  ],
};

const THEME_SCRIPT = `(function(){try{var k="music-cherry:theme";var s=localStorage.getItem(k);var t=(s==="light"||s==="dark")?s:(window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark");document.documentElement.setAttribute("data-theme",t);localStorage.setItem(k,t)}catch(e){}})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-theme="dark"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }}
          suppressHydrationWarning
        />
      </head>
      <body className="h-full flex flex-col overflow-hidden">{children}</body>
    </html>
  );
}