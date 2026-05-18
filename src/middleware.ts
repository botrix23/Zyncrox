import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';

const intlMiddleware = createMiddleware({
  locales: ['es', 'en'],
  defaultLocale: 'es'
});

export default function middleware(req: NextRequest) {
  const intlResponse = intlMiddleware(req);

  // Si intl quiere redirigir (detección de locale), déjalo pasar tal cual
  if (intlResponse && intlResponse.status >= 300 && intlResponse.status < 400) {
    return intlResponse;
  }

  // Para renders de página: inyectar x-pathname en los REQUEST headers
  // para que los Server Components puedan leerlo con headers()
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-pathname', req.nextUrl.pathname);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  // Copiar los headers que next-intl añade (locale info, etc.)
  if (intlResponse) {
    intlResponse.headers.forEach((value, key) => {
      response.headers.set(key, value);
    });
  }

  return response;
}

export const config = {
  // Solo rutas que no sean archivos estáticos ni API
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};
