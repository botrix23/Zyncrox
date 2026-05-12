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

export const metadata: Metadata = {
  title: "Zyncrox | Reservas que se adaptan a tu negocio",
  description: "Gestión de citas online. Personaliza, automatiza y crece sin complicaciones técnicas.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Zyncrox",
  },
  icons: {
    apple: "/icons/icon-192x192.png",
  },
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
