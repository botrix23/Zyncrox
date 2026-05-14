import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';

const intlMiddleware = createMiddleware({
  locales: ['es', 'en'],
  defaultLocale: 'es'
});

export default function middleware(req: NextRequest) {
  const response = intlMiddleware(req) ?? NextResponse.next();
  response.headers.set('x-pathname', req.nextUrl.pathname);
  return response;
}

export const config = {
  // Solo rutas que no sean archivos estáticos ni API
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};
