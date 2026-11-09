/**
 * svm-8004 runtime defaults.
 *
 * Devnet is the implicit cluster so examples, tests, and first-time SDK
 * construction never touch mainnet. Pass `cluster: 'mainnet-beta'` when you
 * intentionally want mainnet program IDs and RPCs.
 */
import type { Cluster } from './client.js';
export declare const DEFAULT_CLUSTER: Cluster;
/**
 * Optional 8004 indexer presets.
 *
 * `none` (default): no remote indexer is implied. Reads fall back on-chain
 * unless you pass `indexerGraphqlUrl` / `indexerUrl` or set INDEXER_GRAPHQL_URL
 * / INDEXER_URL.
 *
 * `quantulabs-public`: use the public QuantuLabs 8004 indexers that ship with
 * the upstream 8004-solana SDK. These are protocol-compatible with the
 * deployed AgentRegistry8004 programs. They are not Musebook infrastructure.
 *
 * `musebook`: the Musebook 8004 REST indexer. The planned public URL is
 * `https://indexer.musebook.trade` (not live yet). Override with
 * `MUSEBOOK_INDEXER_URL` or `INDEXER_URL`. GraphQL v2 is a follow-up;
 * this preset advertises REST only. registry.musebook.trade remains a
 * directory UI, not the 8004 indexer.
 */
export type IndexerPreset = 'none' | 'quantulabs-public' | 'musebook';
export declare const DEFAULT_INDEXER_PRESET: IndexerPreset;
//# sourceMappingURL=defaults.d.ts.map