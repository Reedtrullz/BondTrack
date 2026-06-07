import { NextRequest } from 'next/server';

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-XSS-Protection': '1; mode=block',
};

const BASE_ALLOWED_ORIGINS = [
  'https://thorchain.no',
  'https://dev.thorchain.no',
  'http://localhost:3000',
  'http://localhost:3001',
];

export function corsHeaders(
  request: NextRequest,
  extraOrigins: string[] = [],
  methods: string[] = ['GET', 'OPTIONS']
): HeadersInit {
  const origin = request.headers.get('origin');
  const allowedOrigins = new Set([...BASE_ALLOWED_ORIGINS, ...extraOrigins]);

  if (process.env.NEXT_PUBLIC_APP_URL) allowedOrigins.add(process.env.NEXT_PUBLIC_APP_URL);
  if (process.env.VERCEL_URL) allowedOrigins.add(`https://${process.env.VERCEL_URL}`);

  return {
    'Access-Control-Allow-Origin': origin && allowedOrigins.has(origin) ? origin : 'https://thorchain.no',
    'Access-Control-Allow-Methods': methods.join(', '),
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Vary': 'Origin',
    ...SECURITY_HEADERS,
  };
}

export function noStorePrivateHeaders(
  request: NextRequest,
  extraOrigins: string[] = [],
  methods: string[] = ['GET', 'OPTIONS']
): HeadersInit {
  return {
    ...corsHeaders(request, extraOrigins, methods),
    'Cache-Control': 'no-store, private',
    'Pragma': 'no-cache',
    'Expires': '0',
  };
}
