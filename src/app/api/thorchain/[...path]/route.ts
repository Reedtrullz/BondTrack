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

const THORNODE_ENDPOINTS = [
  process.env.THORNODE_API_URL || 'https://gateway.liquify.com/chain/thorchain_api/thorchain',
];

const ALLOWED_PATHS = [
  /^nodes$/,
  /^node\/[A-Za-z0-9._:-]+$/,
  /^constants$/,
  /^supply$/,
  /^queue$/,
  /^network$/,
  /^lastblock$/,
  /^mimir$/,
  /^version$/,
  /^pools$/,
  /^pool\/[A-Za-z0-9._:-]+$/,
  /^pool\/[A-Za-z0-9._:-]+\/liquidity_provider\/[A-Za-z0-9._:-]+$/,
  /^balance\/[A-Za-z0-9._:-]+$/,
  /^cosmos\/bank\/v1beta1\/balances\/[A-Za-z0-9._:-]+$/,
  /^tx\/[A-Za-z0-9._:-]+$/,
  /^actions$/,
  /^ping$/,
  /^health$/,
  /^stakers$/,
];

const MAX_REQUESTS = 300;
const WINDOW_MS = 60 * 1000;
const SUCCESS_CACHE_CONTROL = 'public, max-age=5';
const SAFE_IDENTIFIER = /^[A-Za-z0-9._:-]+$/;
const THORCHAIN_ASSET = /^[A-Z0-9]+\.[A-Z0-9]+(?:-[A-Z0-9]+)?$/i;
const MAX_HISTORY_RANGE_SECONDS = 370 * 24 * 60 * 60;
const ALLOWED_INTERVALS = new Set(['hour', 'day', 'week', 'month', 'quarter', 'year']);

export const dynamic = 'force-dynamic';

interface QuerySchema {
  allowed: Set<string>;
  requireBothFromTo?: boolean;
}

const NO_QUERY: QuerySchema = { allowed: new Set() };
const ACTIONS_QUERY: QuerySchema = {
  allowed: new Set(['address', 'addresses', 'asset', 'assets', 'limit', 'offset', 'type', 'txType']),
};
const STAKERS_QUERY: QuerySchema = { allowed: new Set(['asset']) };

function isAllowedPath(path: string): boolean {
  return ALLOWED_PATHS.some((pattern) => pattern.test(path));
}

function schemaForPath(path: string): QuerySchema {
  if (path === 'actions') return ACTIONS_QUERY;
  if (path === 'stakers') return STAKERS_QUERY;
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
  return parseStrictInteger(value, 1, 4_102_444_800, name);
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
  if (interval !== null && !ALLOWED_INTERVALS.has(interval)) return 'interval is not supported';

  const from = searchParams.get('from');
  const to = searchParams.get('to');
  if (schema.requireBothFromTo && ((from === null) !== (to === null))) return 'from and to must be supplied together';
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
    if (toValue - fromValue > MAX_HISTORY_RANGE_SECONDS) return 'time range may not exceed 370 days';
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

function getUpstreamBaseUrl(baseUrl: string, decodedPath: string): string {
  // Liquify serves Cosmos SDK endpoints at the THORNode API root, not under
  // /thorchain. Keep /thorchain for normal THORChain endpoints while targeting
  // /chain/thorchain_api/cosmos/... for wallet balance lookups.
  if (decodedPath.startsWith('cosmos/') && /\/thorchain\/?$/.test(baseUrl)) {
    return baseUrl.replace(/\/thorchain\/?$/, '');
  }

  return baseUrl;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;

  // Tolerate clients that include a leading 'thorchain/' segment.
  // THORNODE_API_URL already ends in '/thorchain', so we strip one if present
  // to avoid building a double-prefixed upstream URL.
  const normalizedPath = path[0] === 'thorchain' ? path.slice(1) : path;

  const decodedPath = normalizedPath.join('/');
  const pathStr = normalizedPath.map((part) => encodeURIComponent(part)).join('/');
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
    prefix: 'thorchain',
    maxRequests: MAX_REQUESTS,
    windowMs: WINDOW_MS,
    extraOrigins: ['https://bond.thorchain.no'],
  });
  if (rateLimited) return rateLimited;

  const upstreamResult = await proxyJsonFromUpstreams({
    endpoints: THORNODE_ENDPOINTS,
    path: pathStr,
    search: searchParams,
    retryUpstreams: false,
    fetchHeaders: { 'Accept': 'application/json' },
    getUpstreamBaseUrl,
  });

  if (upstreamResult.ok) {
    return createProxySuccessResponse(request, upstreamResult.data, {
      extraOrigins: ['https://bond.thorchain.no'],
      cacheControl: SUCCESS_CACHE_CONTROL,
    });
  }

  return createProxyUpstreamFailureResponse(request, {
    message: 'All THORNode endpoints failed',
    diagnosticLabel: 'All THORNode endpoints failed',
    path: decodedPath,
    errors: upstreamResult.errors,
    status: upstreamFailureStatus(upstreamResult.statusCodes),
    extraOrigins: ['https://bond.thorchain.no'],
  });
}

export async function OPTIONS(request: NextRequest) {
  return createProxyOptionsResponse(request, {
    extraOrigins: ['https://bond.thorchain.no'],
  });
}
