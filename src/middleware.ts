import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';

// Países de habla hispana → locale 'es'
const SPANISH_COUNTRIES = new Set([
  'AR','BO','CL','CO','CR','CU','DO','EC','SV','GT','HN','MX','NI','PA','PY','PE','PR','ES','UY','VE','GQ'
]);

const LOCALES = ['es', 'en'] as const;

// localeDetection: false → next-intl NO intenta detectar el idioma por su cuenta;
// nosotros manejamos la detección por IP + cookie
const intlMiddleware = createMiddleware({
  locales: LOCALES,
  defaultLocale: 'es',
  localeDetection: false,
});

function detectLocale(req: NextRequest): string {
  // 1. Preferencia manual del usuario (cookie seteada por LocaleSwitcher)
  const cookie = req.cookies.get('NEXT_LOCALE')?.value;
  if (cookie === 'es' || cookie === 'en') return cookie;

  // 2. País detectado por Vercel (header inyectado automáticamente en producción)
  const country = req.headers.get('x-vercel-ip-country') ?? '';
  return SPANISH_COUNTRIES.has(country) ? 'es' : 'en';
}

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Verificar si el path ya tiene un prefijo de locale
  const hasLocale = LOCALES.some(
    (loc) => pathname === `/${loc}` || pathname.startsWith(`/${loc}/`)
  );

  // Si NO tiene locale → detectar y redirigir
  if (!hasLocale) {
    const locale = detectLocale(req);
    const url = req.nextUrl.clone();
    url.pathname = `/${locale}${pathname === '/' ? '' : pathname}`;
    return NextResponse.redirect(url, { status: 307 });
  }

  // Ya tiene locale → dejar que next-intl procese normalmente
  const intlResponse = intlMiddleware(req);
  if (intlResponse && intlResponse.status >= 300 && intlResponse.status < 400) {
    return intlResponse;
  }

  // Inyectar x-pathname en los REQUEST headers para Server Components
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-pathname', pathname);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  if (intlResponse) {
    intlResponse.headers.forEach((value, key) => {
      response.headers.set(key, value);
    });
  }

  return response;
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};
