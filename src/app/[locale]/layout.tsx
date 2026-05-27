import type { Metadata } from "next";
import "../globals.css";
import { Inter, DM_Serif_Display } from "next/font/google";

import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { ThemeProvider } from "../../components/ThemeProvider";
import PWARegister from "../../components/PWARegister";

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });
const dmSerif = DM_Serif_Display({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-serif',
});

const META_DESCRIPTION =
  "Zyncrox es la plataforma de reservas online que se adapta a tu negocio. Personaliza tu portal, ofrece servicios a domicilio y gestiona tu equipo. Prueba 7 días gratis.";

export const metadata: Metadata = {
  title: "Zyncrox | Reservas que se adaptan a tu negocio",
  description: META_DESCRIPTION,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Zyncrox",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/icon-192x192.png",
    shortcut: "/favicon.ico",
  },
  openGraph: {
    type: "website",
    url: "https://www.zyncrox.com",
    title: "Zyncrox | Reservas que se adaptan a tu negocio",
    description: META_DESCRIPTION,
    siteName: "Zyncrox",
    images: [
      {
        url: "https://www.zyncrox.com/icons/icon-512x512.png",
        width: 512,
        height: 512,
        alt: "Zyncrox Logo",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Zyncrox | Reservas que se adaptan a tu negocio",
    description: META_DESCRIPTION,
    images: ["https://www.zyncrox.com/icons/icon-512x512.png"],
  },
};

export const viewport = {
  themeColor: "#8b5cf6",
};

export default async function RootLayout({
  children,
  params: {locale}
}: {
  children: React.ReactNode;
  params: {locale: string};
}) {
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${inter.variable} ${dmSerif.variable} antialiased bg-slate-50 dark:bg-black text-slate-900 dark:text-white transition-colors duration-300`}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <PWARegister />
            {children}
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
