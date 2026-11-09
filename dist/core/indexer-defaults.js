/**
 * Indexer configuration for svm-8004.
 *
 * Remote 8004 indexers are opt-in. The SDK does not silently bind to
 * QuantuLabs (qnt.sh) endpoints. Configure an endpoint explicitly, or
 * select the documented `quantulabs-public` preset.
 *
 * Override via environment variables:
 * - INDEXER_GRAPHQL_URL: GraphQL v2 endpoint (recommended)
 * - INDEXER_URL: Legacy REST v1 API URL
 * - INDEXER_API_KEY: Optional API key/bearer token
 * - INDEXER_PRESET: `quantulabs-public` to use upstream public indexers
 * - FORCE_ON_CHAIN: Set to 'true' to bypass the indexer
 *
 * TODO: A Musebook 8004 indexer is not available yet.
 * registry.musebook.trade answers GET /api/health but is a directory UI,
 * not a 8004 REST/GraphQL indexer (no /rest/v1 or /v2/graphql). Use
 * `@musebook/discovery` against musebook.trade for directory search.
 */
import { DEFAULT_INDEXER_PRESET, } from './defaults.js';
/** Directory surfaces (not a 8004 indexer). */
export const MUSEBOOK_DIRECTORY = {
    hub: 'https://musebook.trade',
    registry: 'https://registry.musebook.trade',
    health: 'https://registry.musebook.trade/api/health',
};
/**
 * Public QuantuLabs 8004 indexers from the upstream 8004-solana SDK.
 * Protocol-compatible with the deployed AgentRegistry8004 programs.
 * Used only when `indexerPreset: 'quantulabs-public'` or
 * INDEXER_PRESET=quantulabs-public is set.
 */
export const QUANTULABS_PUBLIC_INDEXERS = {
    devnet: {
        graphqlUrls: [
            'https://8004-indexer-dev.qnt.sh/v2/graphql',
            'https://8004-indexer-dev2.qnt.sh/v2/graphql',
        ],
        restUrls: [
            'https://8004-indexer-dev.qnt.sh/rest/v1',
            'https://8004-indexer-dev2.qnt.sh/rest/v1',
        ],
    },
    testnet: {
        graphqlUrls: [
            'https://8004-indexer-dev.qnt.sh/v2/graphql',
            'https://8004-indexer-dev2.qnt.sh/v2/graphql',
        ],
        restUrls: [
            'https://8004-indexer-dev.qnt.sh/rest/v1',
            'https://8004-indexer-dev2.qnt.sh/rest/v1',
        ],
    },
    'mainnet-beta': {
        graphqlUrls: [
            'https://8004-indexer-main.qnt.sh/v2/graphql',
            'https://8004-indexer-main2.qnt.sh/v2/graphql',
        ],
        restUrls: [
            'https://8004-indexer-main.qnt.sh/rest/v1',
            'https://8004-indexer-main2.qnt.sh/rest/v1',
        ],
    },
    localnet: {
        graphqlUrls: ['http://127.0.0.1:3005/v2/graphql'],
        restUrls: ['http://127.0.0.1:3005/rest/v1'],
    },
};
const LOCALNET_INDEXERS = QUANTULABS_PUBLIC_INDEXERS.localnet;
function getEnv(key) {
    if (typeof process !== 'undefined' && process.env) {
        return process.env[key];
    }
    return undefined;
}
export function resolveIndexerPreset(explicit) {
    if (explicit)
        return explicit;
    const env = getEnv('INDEXER_PRESET');
    if (env === 'quantulabs-public')
        return 'quantulabs-public';
    if (env === 'none')
        return 'none';
    return DEFAULT_INDEXER_PRESET;
}
function presetUrls(cluster, kind, options) {
    if (cluster === 'localnet') {
        return [...LOCALNET_INDEXERS[kind]];
    }
    if (resolveIndexerPreset(options?.preset) === 'quantulabs-public') {
        return [...QUANTULABS_PUBLIC_INDEXERS[cluster][kind]];
    }
    return [];
}
export function getDefaultIndexerUrl(cluster, options) {
    return getEnv('INDEXER_URL') || presetUrls(cluster, 'restUrls', options)[0] || '';
}
export function getDefaultIndexerGraphqlUrl(cluster, options) {
    return getEnv('INDEXER_GRAPHQL_URL') || presetUrls(cluster, 'graphqlUrls', options)[0] || '';
}
export function getDefaultIndexerUrls(cluster, options) {
    const override = getEnv('INDEXER_URL');
    return override ? [override] : presetUrls(cluster, 'restUrls', options);
}
export function getDefaultIndexerGraphqlUrls(cluster, options) {
    const override = getEnv('INDEXER_GRAPHQL_URL');
    return override ? [override] : presetUrls(cluster, 'graphqlUrls', options);
}
export function getDefaultIndexerApiKey() {
    return getEnv('INDEXER_API_KEY') || '';
}
/** Empty unless INDEXER_URL or a remote preset is set (localnet has a localhost default). */
export const DEFAULT_INDEXER_URL = getDefaultIndexerUrl('devnet');
export const DEFAULT_INDEXER_API_KEY = getDefaultIndexerApiKey();
export const DEFAULT_INDEXER_GRAPHQL_URL = getDefaultIndexerGraphqlUrl('devnet');
/**
 * Force on-chain mode (bypass indexer):
 * - false (default): Smart routing when an indexer is configured
 * - true: Force all on-chain (indexer-only methods will throw)
 */
export const DEFAULT_FORCE_ON_CHAIN = getEnv('FORCE_ON_CHAIN') === 'true';
/**
 * List of operations considered "small queries" that prefer RPC
 * These are single-account fetches or queries with predictably small result sets
 */
export const SMALL_QUERY_OPERATIONS = [
    'getAgent',
    'getCollection',
    'readFeedback',
    'getSummary',
];
//# sourceMappingURL=indexer-defaults.js.map