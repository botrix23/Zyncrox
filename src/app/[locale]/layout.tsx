import type { Metadata } from "next";
import "../globals.css";
import { Inter, DM_Serif_Display } from "next/font/google";

import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { ThemeProvider } from "../../components/ThemeProvider";
import PWARegister from "../../components/PWARegister";

const BASE_URL = "https://www.zyncrox.com";

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });
const dmSerif = DM_Serif_Display({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-serif',
});

const META_DESCRIPTION =
  "Zyncrox es la plataforma de reservas online que se adapta a tu negocio. Personaliza tu portal, ofrece servicios a domicilio y gestiona tu equipo. Prueba 7 días gratis.";

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  return {
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
    // Canonical + hreflang: tells Google which locale is authoritative and how they relate
    alternates: {
      canonical: `${BASE_URL}/${locale}`,
      languages: {
        "es": `${BASE_URL}/es`,
        "en": `${BASE_URL}/en`,
        "x-default": `${BASE_URL}/es`,
      },
    },
    openGraph: {
      type: "website",
      url: `${BASE_URL}/${locale}`,
      title: "Zyncrox | Reservas que se adaptan a tu negocio",
      description: META_DESCRIPTION,
      siteName: "Zyncrox",
      images: [
        {
          url: `${BASE_URL}/icons/icon-512x512.png`,
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
      images: [`${BASE_URL}/icons/icon-512x512.png`],
    },
  };
}

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
