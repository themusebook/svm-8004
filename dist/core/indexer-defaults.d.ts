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
 * The Musebook 8004 indexer lives in this repo as
 * `@musebook/svm-8004-indexer`. The planned public URL is
 * https://indexer.musebook.trade (not live yet). Use
 * `indexerPreset: 'musebook'` or `INDEXER_PRESET=musebook`, and set
 * `MUSEBOOK_INDEXER_URL` (or INDEXER_URL) to a running instance such as
 * http://127.0.0.1:3005/rest/v1. GraphQL v2 is a follow-up.
 *
 * registry.musebook.trade is still a directory UI, not the 8004 indexer.
 * Use `@musebook/discovery` against musebook.trade for directory search.
 */
import type { Cluster } from './client.js';
import { type IndexerPreset } from './defaults.js';
/** Directory surfaces (not a 8004 indexer). */
export declare const MUSEBOOK_DIRECTORY: {
    readonly hub: "https://musebook.trade";
    readonly registry: "https://registry.musebook.trade";
    readonly health: "https://registry.musebook.trade/api/health";
};
/** Planned public Musebook 8004 indexer (not live yet). */
export declare const MUSEBOOK_INDEXER_HOST = "https://indexer.musebook.trade";
/**
 * Public QuantuLabs 8004 indexers from the upstream 8004-solana SDK.
 * Protocol-compatible with the deployed AgentRegistry8004 programs.
 * Used only when `indexerPreset: 'quantulabs-public'` or
 * INDEXER_PRESET=quantulabs-public is set.
 */
export declare const QUANTULABS_PUBLIC_INDEXERS: Record<Cluster, {
    graphqlUrls: string[];
    restUrls: string[];
}>;
export interface IndexerDefaultOptions {
    preset?: IndexerPreset;
}
export declare function resolveIndexerPreset(explicit?: IndexerPreset): IndexerPreset;
export declare function getDefaultIndexerUrl(cluster: Cluster, options?: IndexerDefaultOptions): string;
export declare function getDefaultIndexerGraphqlUrl(cluster: Cluster, options?: IndexerDefaultOptions): string;
export declare function getDefaultIndexerUrls(cluster: Cluster, options?: IndexerDefaultOptions): string[];
export declare function getDefaultIndexerGraphqlUrls(cluster: Cluster, options?: IndexerDefaultOptions): string[];
export declare function getDefaultIndexerApiKey(): string;
/** Empty unless INDEXER_URL or a remote preset is set (localnet has a localhost default). */
export declare const DEFAULT_INDEXER_URL: string;
export declare const DEFAULT_INDEXER_API_KEY: string;
export declare const DEFAULT_INDEXER_GRAPHQL_URL: string;
/**
 * Force on-chain mode (bypass indexer):
 * - false (default): Smart routing when an indexer is configured
 * - true: Force all on-chain (indexer-only methods will throw)
 */
export declare const DEFAULT_FORCE_ON_CHAIN: boolean;
/**
 * List of operations considered "small queries" that prefer RPC
 * These are single-account fetches or queries with predictably small result sets
 */
export declare const SMALL_QUERY_OPERATIONS: readonly ["getAgent", "getCollection", "readFeedback", "getSummary"];
//# sourceMappingURL=indexer-defaults.d.ts.map