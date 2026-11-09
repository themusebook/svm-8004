/**
 * svm-8004 runtime defaults.
 *
 * Devnet is the implicit cluster so examples, tests, and first-time SDK
 * construction never touch mainnet. Pass `cluster: 'mainnet-beta'` when you
 * intentionally want mainnet program IDs and RPCs.
 */

import type { Cluster } from './client.js';

export const DEFAULT_CLUSTER: Cluster = 'devnet';

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
 * TODO: When a Musebook 8004 REST/GraphQL indexer exists, add a
 * `musebook` preset. registry.musebook.trade is a directory UI
 * (`GET /api/health` is healthy) and does not speak `/rest/v1` or
 * `/v2/graphql`. The human directory lives at musebook.trade; use
 * `@musebook/discovery` for directory search, not the 8004 indexer client.
 */
export type IndexerPreset = 'none' | 'quantulabs-public';

export const DEFAULT_INDEXER_PRESET: IndexerPreset = 'none';
