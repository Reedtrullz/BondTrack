import { NextRequest } from 'next/server';
import {
  createProxyErrorResponse,
  createProxyOptionsResponse,
  createProxySuccessResponse,
  createProxyUpstreamFailureResponse,
  proxyJsonFromUpstreams,
  rateLimitProxyRequest,
  upstreamFailureStatus,
} from '@/lib/api/proxy';

const MIDGARD_ENDPOINTS = [
  process.env.MIDGARD_API_URL || 'https://gateway.liquify.com/chain/thorchain_midgard',
  process.env.MIDGARD_FALLBACK_URL || 'https://midgard.thorchain.network',
];

const ALLOWED_PATHS = [
  /^v2\/health$/,
  /^v2\/bonds\/[A-Za-z0-9._:-]+$/,
  /^v2\/churns$/,
  /^v2\/history\/(earnings|rune)$/,
  /^v2\/network$/,
  /^v2\/actions$/,
  /^v2\/pools$/,
  /^v2\/pools\/[A-Za-z0-9._:-]+\/history$/,
  /^v2\/thorname\/(lookup|rlookup)\/[A-Za-z0-9._-]+$/,
  /^v2\/member\/[A-Za-z0-9._:-]+$/,
];

export const dynamic = 'force-dynamic';

const MAX_REQUESTS = 300;
const WINDOW_MS = 60 * 1000;
const SUCCESS_CACHE_CONTROL = 'public, max-age=30';
const MAX_HISTORY_RANGE_SECONDS = 370 * 24 * 60 * 60;
const SAFE_IDENTIFIER = /^[A-Za-z0-9._:-]+$/;
const THORCHAIN_ASSET = /^[A-Z0-9]+\.[A-Z0-9]+(?:-[A-Z0-9]+)?$/i;
const ALLOWED_INTERVALS = new Set(['hour', 'day', 'week', 'month', 'quarter', 'year']);

interface QuerySchema {
  allowed: Set<string>;
  requireBothFromTo?: boolean;
}

const NO_QUERY: QuerySchema = { allowed: new Set() };
const HISTORY_QUERY: QuerySchema = {
  allowed: new Set(['interval', 'count', 'from', 'to']),
  requireBothFromTo: true,
};
const ACTIONS_QUERY: QuerySchema = {
  allowed: new Set(['address', 'addresses', 'asset', 'assets', 'limit', 'offset', 'type', 'txType']),
};

function isAllowedPath(path: string): boolean {
  return ALLOWED_PATHS.some((pattern) => pattern.test(path));
}

function schemaForPath(path: string): QuerySchema {
  if (path === 'v2/actions') return ACTIONS_QUERY;
  if (/^v2\/history\/(earnings|rune)$/.test(path)) return HISTORY_QUERY;
  if (/^v2\/pools\/[A-Za-z0-9._:-]+\/history$/.test(path)) return HISTORY_QUERY;
  return NO_QUERY;
}

function parseStrictInteger(value: string, min: number, max: number, name: string): string | null {
  if (!/^\d+$/.test(value)) return `${name} must be an integer`;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) {
    return `${name} must be between ${min} and ${max}`;
  }
  return null;
}

function parseUnixSeconds(value: string, name: string): string | null {
  const integerError = parseStrictInteger(value, 1, 4_102_444_800, name); // 2100-01-01
  if (integerError) return integerError;
  return null;
}

function validateIdentifierList(value: string, name: string, pattern = SAFE_IDENTIFIER): string | null {
  if (value.length === 0 || value.length > 1024) return `${name} is invalid`;
  const entries = value.split(',');
  if (entries.length > 25) return `${name} may include at most 25 entries`;
  for (const entry of entries) {
    if (entry.length === 0 || entry.length > 128 || !pattern.test(entry)) {
      return `${name} contains an invalid identifier`;
    }
  }
  return null;
}

function validateQuery(path: string, searchParams: URLSearchParams): string | null {
  const schema = schemaForPath(path);

  for (const key of searchParams.keys()) {
    if (!schema.allowed.has(key)) return `Query parameter '${key}' is not allowed for this path`;
    if (searchParams.getAll(key).length > 1) return `Query parameter '${key}' may only be supplied once`;
  }

  const limit = searchParams.get('limit');
  if (limit !== null) {
    const error = parseStrictInteger(limit, 1, 1000, 'limit');
    if (error) return error;
  }

  const offset = searchParams.get('offset');
  if (offset !== null) {
    const error = parseStrictInteger(offset, 0, 10_000, 'offset');
    if (error) return error;
  }

  const count = searchParams.get('count');
  if (count !== null) {
    const error = parseStrictInteger(count, 1, 400, 'count');
    if (error) return error;
  }

  const interval = searchParams.get('interval');
  if (interval !== null && !ALLOWED_INTERVALS.has(interval)) {
    return 'interval is not supported';
  }

  const from = searchParams.get('from');
  const to = searchParams.get('to');
  if (schema.requireBothFromTo && ((from === null) !== (to === null))) {
    return 'from and to must be supplied together';
  }
  if (from !== null) {
    const error = parseUnixSeconds(from, 'from');
    if (error) return error;
  }
  if (to !== null) {
    const error = parseUnixSeconds(to, 'to');
    if (error) return error;
  }
  if (from !== null && to !== null) {
    const fromValue = Number(from);
    const toValue = Number(to);
    if (toValue <= fromValue) return 'to must be greater than from';
    if (toValue - fromValue > MAX_HISTORY_RANGE_SECONDS) {
      return 'time range may not exceed 370 days';
    }
  }

  const address = searchParams.get('address');
  if (address !== null) {
    const error = validateIdentifierList(address, 'address');
    if (error) return error;
  }
  const addresses = searchParams.get('addresses');
  if (addresses !== null) {
    const error = validateIdentifierList(addresses, 'addresses');
    if (error) return error;
  }
  const asset = searchParams.get('asset');
  if (asset !== null) {
    const error = validateIdentifierList(asset, 'asset', THORCHAIN_ASSET);
    if (error) return error;
  }
  const assets = searchParams.get('assets');
  if (assets !== null) {
    const error = validateIdentifierList(assets, 'assets', THORCHAIN_ASSET);
    if (error) return error;
  }

  const type = searchParams.get('type');
  if (type !== null) {
    const error = validateIdentifierList(type, 'type');
    if (error) return error;
  }

  const txType = searchParams.get('txType');
  if (txType !== null) {
    const error = validateIdentifierList(txType, 'txType');
    if (error) return error;
  }

  return null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const pathStr = path.map((part) => encodeURIComponent(part)).join('/');
  const decodedPath = path.join('/');
  const searchParams = request.nextUrl.search;

  if (!isAllowedPath(decodedPath)) {
    return createProxyErrorResponse(request, 'Proxy path is not allowed', 403, {
      extraOrigins: ['https://bond.thorchain.no'],
    });
  }

  const queryError = validateQuery(decodedPath, request.nextUrl.searchParams);
  if (queryError) {
    return createProxyErrorResponse(request, queryError, 400, {
      extraOrigins: ['https://bond.thorchain.no'],
    });
  }

  const rateLimited = rateLimitProxyRequest(request, {
    prefix: 'midgard',
    maxRequests: MAX_REQUESTS,
    windowMs: WINDOW_MS,
    extraOrigins: ['https://bond.thorchain.no'],
  });
  if (rateLimited) return rateLimited;

  const upstreamResult = await proxyJsonFromUpstreams({
    endpoints: MIDGARD_ENDPOINTS,
    path: pathStr,
    search: searchParams,
    retryUpstreams: true,
    fetchHeaders: {
      'Accept': 'application/json',
      'User-Agent': 'Heimdall/1.0',
    },
  });

  if (upstreamResult.ok) {
    return createProxySuccessResponse(request, upstreamResult.data, {
      extraOrigins: ['https://bond.thorchain.no'],
      cacheControl: SUCCESS_CACHE_CONTROL,
    });
  }

  // If all failed, prefer returning a client error (400-499) if any endpoint said so, otherwise 502.
  // Keep upstream URLs and status details in server diagnostics only.
  return createProxyUpstreamFailureResponse(request, {
    message: 'All Midgard endpoints failed',
    diagnosticLabel: 'All Midgard endpoints failed',
    path: decodedPath,
    errors: upstreamResult.errors,
    status: upstreamFailureStatus(upstreamResult.statusCodes, { preferClientError: true }),
    extraOrigins: ['https://bond.thorchain.no'],
  });
}

export async function OPTIONS(request: NextRequest) {
  return createProxyOptionsResponse(request, {
    extraOrigins: ['https://bond.thorchain.no'],
  });
}
