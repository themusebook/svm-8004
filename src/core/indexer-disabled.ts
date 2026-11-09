/**
 * Placeholder indexer used when no endpoint or preset is configured.
 * Reads should fall back on-chain; indexer-only methods throw a clear error.
 */

import { IndexerUnavailableError } from './indexer-errors.js';
import type {
  AgentQueryOptions,
  CheckpointSet,
  CollectionAssetsQueryOptions,
  CollectionPointerQueryOptions,
  CollectionPointerRecord,
  CollectionStats,
  GlobalStats,
  IndexedAgent,
  IndexedAgentReputation,
  IndexedFeedback,
  IndexedFeedbackResponse,
  IndexedRevocation,
  IndexedValidation,
  IndexerReadClient,
  ReplayDataPage,
  ServerReplayResult,
} from './indexer-client.js';

const NOT_CONFIGURED =
  'No SVM-8004 indexer configured. Pass indexerGraphqlUrl (or indexerUrl), set INDEXER_GRAPHQL_URL / INDEXER_URL, or use indexerPreset: "quantulabs-public". A Musebook 8004 indexer is not available yet; registry.musebook.trade is a directory UI, not this API.';

function notConfigured(): never {
  throw new IndexerUnavailableError(NOT_CONFIGURED);
}

export class DisabledIndexerClient implements IndexerReadClient {
  getBaseUrl(): string {
    return '';
  }

  isAvailable(): Promise<boolean> {
    return Promise.resolve(false);
  }

  getAgent(_asset: string): Promise<IndexedAgent | null> {
    return notConfigured();
  }

  getAgentByAgentId(_agentId: string | number | bigint): Promise<IndexedAgent | null> {
    return notConfigured();
  }

  getAgents(_options?: AgentQueryOptions): Promise<IndexedAgent[]> {
    return notConfigured();
  }

  getAgentsByOwner(_owner: string): Promise<IndexedAgent[]> {
    return notConfigured();
  }

  getAgentsByCollection(_collection: string): Promise<IndexedAgent[]> {
    return notConfigured();
  }

  getAgentByWallet(_wallet: string): Promise<IndexedAgent | null> {
    return notConfigured();
  }

  getLeaderboard(_options?: {
    collection?: string;
    minTier?: number;
    limit?: number;
    cursorSortKey?: string;
  }): Promise<IndexedAgent[]> {
    return notConfigured();
  }

  getCollectionPointers(_options?: CollectionPointerQueryOptions): Promise<CollectionPointerRecord[]> {
    return notConfigured();
  }

  getCollectionAssetCount(_col: string, _creator?: string): Promise<number> {
    return notConfigured();
  }

  getCollectionAssets(_col: string, _options?: CollectionAssetsQueryOptions): Promise<IndexedAgent[]> {
    return notConfigured();
  }

  getCollectionStats(_collection: string): Promise<CollectionStats | null> {
    return notConfigured();
  }

  getAllCollectionStats(): Promise<CollectionStats[]> {
    return notConfigured();
  }

  getGlobalStats(): Promise<GlobalStats> {
    return notConfigured();
  }

  getFeedbacks(
    _asset: string,
    _options?: { includeRevoked?: boolean; limit?: number; offset?: number },
  ): Promise<IndexedFeedback[]> {
    return notConfigured();
  }

  getFeedback(
    _asset: string,
    _client: string,
    _feedbackIndex: number | bigint,
  ): Promise<IndexedFeedback | null> {
    return notConfigured();
  }

  getFeedbackById(_feedbackId: string): Promise<IndexedFeedback | null> {
    return notConfigured();
  }

  getFeedbacksByClient(_client: string): Promise<IndexedFeedback[]> {
    return notConfigured();
  }

  getFeedbacksByTag(_tag: string): Promise<IndexedFeedback[]> {
    return notConfigured();
  }

  getFeedbacksByEndpoint(_endpoint: string): Promise<IndexedFeedback[]> {
    return notConfigured();
  }

  getAllFeedbacks(_options?: { includeRevoked?: boolean; limit?: number }): Promise<IndexedFeedback[]> {
    return notConfigured();
  }

  getLastFeedbackIndex(_asset: string, _client: string): Promise<bigint> {
    return notConfigured();
  }

  getFeedbackResponsesFor(
    _asset: string,
    _client: string,
    _feedbackIndex: number | bigint,
    _limit?: number,
  ): Promise<IndexedFeedbackResponse[]> {
    return notConfigured();
  }

  getFeedbackResponsesByFeedbackId(
    _feedbackId: string,
    _limit?: number,
  ): Promise<IndexedFeedbackResponse[]> {
    return notConfigured();
  }

  getPendingValidations(_validator: string): Promise<IndexedValidation[]> {
    return notConfigured();
  }

  getAgentReputation(_asset: string): Promise<IndexedAgentReputation | null> {
    return notConfigured();
  }

  getLastFeedbackDigest(_asset: string): Promise<{ digest: string | null; count: number }> {
    return notConfigured();
  }

  getLastResponseDigest(_asset: string): Promise<{ digest: string | null; count: number }> {
    return notConfigured();
  }

  getLastRevokeDigest(_asset: string): Promise<{ digest: string | null; count: number }> {
    return notConfigured();
  }

  getFeedbacksAtIndices(
    _asset: string,
    _indices: number[],
  ): Promise<Map<number, IndexedFeedback | null>> {
    return notConfigured();
  }

  getResponsesAtOffsets(
    _asset: string,
    _offsets: number[],
  ): Promise<Map<number, IndexedFeedbackResponse | null>> {
    return notConfigured();
  }

  getRevocationsAtCounts(
    _asset: string,
    _revokeCounts: number[],
  ): Promise<Map<number, IndexedRevocation | null>> {
    return notConfigured();
  }

  getReplayData(
    _asset: string,
    _chainType: 'feedback' | 'response' | 'revoke',
    _fromCount?: number,
    _toCount?: number,
    _limit?: number,
  ): Promise<ReplayDataPage> {
    return notConfigured();
  }

  getLatestCheckpoints(_asset: string): Promise<CheckpointSet> {
    return notConfigured();
  }

  triggerReplay(_asset: string): Promise<ServerReplayResult> {
    return notConfigured();
  }
}

export { NOT_CONFIGURED as INDEXER_NOT_CONFIGURED_MESSAGE };
