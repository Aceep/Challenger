import type { Metadata, Viewport } from "next";
import { Fraunces, Nunito_Sans } from "next/font/google";
import "./globals.css";

// Both are variable fonts: weights 500/700/900 (display) and 400–800 (body) come
// from the wght axis, `opsz` keeps Fraunces optically sized from 9 to 144.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz"],
  style: ["normal", "italic"],
  display: "swap",
});

const nunito = Nunito_Sans({
  variable: "--font-nunito",
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Aceep&Kyle",
  description: "Défis lecture en équipe : chaque page lue rapporte des points, le bingo, les quêtes et l'histoire font le reste.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#FFD84A",
};

/** Applies the stored theme before first paint (Auto / Clair / Sombre, cf. ThemeToggle). */
const NO_FLASH = `try{var t=localStorage.getItem("ak-theme");if(t==="dark"||t==="light")document.documentElement.setAttribute("data-theme",t)}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${fraunces.variable} ${nunito.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH }} />
      </head>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
