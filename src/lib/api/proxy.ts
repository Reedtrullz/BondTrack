import { NextRequest, NextResponse } from 'next/server';
import { corsHeaders, noStorePrivateHeaders } from '@/lib/api/cors';
import { checkRateLimit, getClientIp } from '@/lib/api/rate-limit';

const DEFAULT_PROXY_TIMEOUT_MS = 30_000;

interface ProxyHeaderOptions {
  extraOrigins?: string[];
  methods?: string[];
}

interface ProxySuccessResponseOptions extends ProxyHeaderOptions {
  cacheControl: string;
}

interface ProxyErrorResponseOptions extends ProxyHeaderOptions {
  headers?: HeadersInit;
}

export interface RateLimitProxyOptions extends ProxyHeaderOptions {
  prefix: string;
  maxRequests: number;
  windowMs: number;
}

interface ProxyJsonFromUpstreamsOptions {
  endpoints: string[];
  path: string;
  search?: string;
  fetchHeaders: HeadersInit;
  retryUpstreams: boolean;
  timeoutMs?: number;
  getUpstreamBaseUrl?: (baseUrl: string, path: string) => string;
}

export type ProxyJsonFromUpstreamsResult =
  | {
      ok: true;
      data: unknown;
    }
  | {
      ok: false;
      errors: string[];
      statusCodes: number[];
    };

export function createProxySuccessResponse(
  request: NextRequest,
  data: unknown,
  options: ProxySuccessResponseOptions
): NextResponse {
  return NextResponse.json(data, {
    headers: {
      ...corsHeaders(request, options.extraOrigins, options.methods),
      'Cache-Control': options.cacheControl,
    },
  });
}

export function createProxyErrorResponse(
  request: NextRequest,
  error: string,
  status: number,
  options: ProxyErrorResponseOptions = {}
): NextResponse {
  return NextResponse.json(
    { error },
    {
      status,
      headers: {
        ...noStorePrivateHeaders(request, options.extraOrigins, options.methods),
        ...options.headers,
      },
    }
  );
}

export function createProxyOptionsResponse(
  request: NextRequest,
  options: ProxyHeaderOptions = {}
): NextResponse {
  return new NextResponse(null, {
    headers: corsHeaders(request, options.extraOrigins, options.methods),
  });
}

export function rateLimitProxyRequest(
  request: NextRequest,
  options: RateLimitProxyOptions
): NextResponse | null {
  const clientIp = getClientIp(request);
  const rateLimit = checkRateLimit(`${options.prefix}:${clientIp}`, options.maxRequests, options.windowMs);

  if (rateLimit.allowed) return null;

  return createProxyErrorResponse(request, 'Rate limit exceeded', 429, {
    extraOrigins: options.extraOrigins,
    methods: options.methods,
    headers: {
      'Retry-After': String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)),
      'X-RateLimit-Limit': String(options.maxRequests),
      'X-RateLimit-Remaining': '0',
      'X-RateLimit-Reset': String(Math.ceil(rateLimit.resetAt / 1000)),
    },
  });
}

export async function proxyJsonFromUpstreams(
  options: ProxyJsonFromUpstreamsOptions
): Promise<ProxyJsonFromUpstreamsResult> {
  const errors: string[] = [];
  const statusCodes: number[] = [];
  const timeoutMs = options.timeoutMs ?? DEFAULT_PROXY_TIMEOUT_MS;
  const upstreams = options.retryUpstreams ? options.endpoints : options.endpoints.slice(0, 1);

  for (const baseUrl of upstreams) {
    const upstreamBaseUrl = options.getUpstreamBaseUrl?.(baseUrl, options.path) ?? baseUrl;
    const targetUrl = `${upstreamBaseUrl}/${options.path}${options.search ?? ''}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(targetUrl, {
        headers: options.fetchHeaders,
        cache: 'no-store',
        signal: controller.signal,
      });

      if (!response.ok) {
        statusCodes.push(response.status);
        errors.push(`${upstreamBaseUrl}: ${response.status}`);
        continue;
      }

      return { ok: true, data: await response.json() };
    } catch {
      errors.push(`${baseUrl}: request failed`);
      continue;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  return { ok: false, errors, statusCodes };
}

export function upstreamFailureStatus(
  statusCodes: number[],
  options: { preferClientError?: boolean; fallbackStatus?: number } = {}
): number {
  if (options.preferClientError) {
    const clientError = statusCodes.find((code) => code >= 400 && code < 500);
    if (clientError) return clientError;
  }

  return options.fallbackStatus ?? 502;
}

export function createProxyUpstreamFailureResponse(
  request: NextRequest,
  options: {
    message: string;
    diagnosticLabel: string;
    path: string;
    errors: string[];
    status: number;
    extraOrigins?: string[];
    methods?: string[];
  }
): NextResponse {
  console.warn(options.diagnosticLabel, { path: options.path, errors: options.errors });

  return createProxyErrorResponse(request, options.message, options.status, {
    extraOrigins: options.extraOrigins,
    methods: options.methods,
  });
}
