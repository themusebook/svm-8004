/**
 * Subset of PostgREST query params used by @musebook/svm-8004 IndexerClient.
 *
 * Supported:
 *   field=eq.value | neq | gt | gte | lt | lte | like | is
 *   field_gt / field_lt (custom params the SDK also sends)
 *   limit, offset, order=field.asc|desc[,field2.desc]
 *   or=(field.eq.value,field2.eq.value)
 *   select=col1,col2
 */

export type FilterOp = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'is';

export interface Filter {
  field: string;
  op: FilterOp;
  value: string;
}

export interface ParsedQuery {
  filters: Filter[];
  orGroups: Filter[][];
  order: Array<{ field: string; dir: 'asc' | 'desc' }>;
  limit?: number;
  offset?: number;
  select?: string[];
  countExact: boolean;
}

const OPS: FilterOp[] = ['neq', 'gte', 'lte', 'eq', 'gt', 'lt', 'like', 'is'];

function parsePredicate(token: string): Filter | null {
  const trimmed = token.trim();
  if (!trimmed) return null;
  for (const op of OPS) {
    const needle = `.${op}.`;
    const at = trimmed.indexOf(needle);
    if (at > 0) {
      return { field: trimmed.slice(0, at), op, value: decodeValue(trimmed.slice(at + needle.length)) };
    }
  }
  return null;
}

function decodeValue(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export function parseQuery(search: URLSearchParams, preferHeader?: string | null): ParsedQuery {
  const parsed: ParsedQuery = {
    filters: [],
    orGroups: [],
    order: [],
    countExact: (preferHeader ?? '').toLowerCase().includes('count=exact'),
  };

  for (const [key, raw] of search.entries()) {
    if (key === 'limit') {
      const n = Number(raw);
      if (Number.isFinite(n) && n >= 0) parsed.limit = Math.min(Math.trunc(n), 10_000);
      continue;
    }
    if (key === 'offset') {
      const n = Number(raw);
      if (Number.isFinite(n) && n >= 0) parsed.offset = Math.trunc(n);
      continue;
    }
    if (key === 'order') {
      parsed.order = raw.split(',').map((part) => {
        const [field, dir] = part.split('.');
        const direction: 'asc' | 'desc' = dir === 'asc' ? 'asc' : 'desc';
        return { field, dir: direction };
      }).filter((part) => part.field);
      continue;
    }
    if (key === 'select') {
      parsed.select = raw.split(',').map((s) => s.trim()).filter(Boolean);
      continue;
    }
    if (key === 'or') {
      const inner = raw.trim().replace(/^\(/, '').replace(/\)$/, '');
      const group = inner.split(',').map(parsePredicate).filter((f): f is Filter => f !== null);
      if (group.length) parsed.orGroups.push(group);
      continue;
    }
    const suffix = key.match(/^(.*)_(gt|gte|lt|lte|neq|eq)$/);
    if (suffix && !raw.startsWith('eq.') && !raw.startsWith('gt.') && !raw.startsWith('lt.')) {
      parsed.filters.push({ field: suffix[1], op: suffix[2] as FilterOp, value: decodeValue(raw) });
      continue;
    }
    const pred = parsePredicate(`${key}.${raw.includes('.') ? raw : `eq.${raw}`}`);
    // PostgREST: field=eq.value  (raw already is "eq.value")
    const direct = parsePredicate(`${key}.${raw}`);
    if (raw.includes('.')) {
      const parsedPred = parsePredicate(`${key}.${raw}`);
      // "asset=eq.XYZ" => parsePredicate("asset.eq.XYZ")
      if (parsedPred) {
        parsed.filters.push(parsedPred);
        continue;
      }
    }
    if (direct) {
      parsed.filters.push(direct);
    } else {
      parsed.filters.push({ field: key, op: 'eq', value: decodeValue(raw) });
    }
    void pred;
  }
  return parsed;
}

function coerceCompare(left: unknown, right: string): { left: unknown; right: unknown } {
  if (typeof left === 'number' && /^-?\d+(\.\d+)?$/.test(right)) {
    return { left, right: Number(right) };
  }
  if (typeof left === 'bigint' && /^-?\d+$/.test(right)) {
    return { left, right: BigInt(right) };
  }
  if (typeof left === 'boolean') {
    return { left, right: right === 'true' };
  }
  if (left == null) return { left, right };
  return { left: String(left), right };
}

export function matchFilter(row: Record<string, unknown>, filter: Filter): boolean {
  const raw = row[filter.field];
  if (filter.op === 'is') {
    if (filter.value === 'null') return raw === null || raw === undefined;
    if (filter.value === 'true') return raw === true;
    if (filter.value === 'false') return raw === false;
  }
  const { left, right } = coerceCompare(raw, filter.value);
  switch (filter.op) {
    case 'eq':
      return left === right || String(left) === String(right);
    case 'neq':
      return left !== right && String(left) !== String(right);
    case 'gt':
      return (left as number | string) > (right as number | string);
    case 'gte':
      return (left as number | string) >= (right as number | string);
    case 'lt':
      return (left as number | string) < (right as number | string);
    case 'lte':
      return (left as number | string) <= (right as number | string);
    case 'like':
      return new RegExp('^' + filter.value.replace(/%/g, '.*').replace(/_/g, '.') + '$').test(String(raw ?? ''));
    default:
      return false;
  }
}

export function applyQuery(
  rows: Record<string, unknown>[],
  query: ParsedQuery,
): { rows: Record<string, unknown>[]; total: number } {
  let filtered = rows.filter((row) => {
    if (!query.filters.every((filter) => matchFilter(row, filter))) return false;
    if (query.orGroups.length === 0) return true;
    return query.orGroups.every((group) => group.some((filter) => matchFilter(row, filter)));
  });

  if (query.order.length) {
    filtered = [...filtered].sort((a, b) => {
      for (const { field, dir } of query.order) {
        const av = a[field];
        const bv = b[field];
        if (av === bv) continue;
        if (av == null) return dir === 'asc' ? -1 : 1;
        if (bv == null) return dir === 'asc' ? 1 : -1;
        const cmp = av < bv ? -1 : 1;
        return dir === 'asc' ? cmp : -cmp;
      }
      return 0;
    });
  }

  const total = filtered.length;
  const offset = query.offset ?? 0;
  const limited = query.limit === undefined ? filtered.slice(offset) : filtered.slice(offset, offset + query.limit);

  if (query.select && query.select.length) {
    return {
      total,
      rows: limited.map((row) => {
        const out: Record<string, unknown> = {};
        for (const key of query.select!) {
          if (key in row) out[key] = row[key];
        }
        return out;
      }),
    };
  }
  return { rows: limited, total };
}
