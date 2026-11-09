/**
 * Placeholder indexer used when no endpoint or preset is configured.
 * Reads should fall back on-chain; indexer-only methods throw a clear error.
 */
import type { AgentQueryOptions, CheckpointSet, CollectionAssetsQueryOptions, CollectionPointerQueryOptions, CollectionPointerRecord, CollectionStats, GlobalStats, IndexedAgent, IndexedAgentReputation, IndexedFeedback, IndexedFeedbackResponse, IndexedRevocation, IndexedValidation, IndexerReadClient, ReplayDataPage, ServerReplayResult } from './indexer-client.js';
declare const NOT_CONFIGURED = "No SVM-8004 indexer configured. Pass indexerGraphqlUrl (or indexerUrl), set INDEXER_GRAPHQL_URL / INDEXER_URL, or use indexerPreset: \"quantulabs-public\". A Musebook 8004 indexer is not available yet; registry.musebook.trade is a directory UI, not this API.";
export declare class DisabledIndexerClient implements IndexerReadClient {
    getBaseUrl(): string;
    isAvailable(): Promise<boolean>;
    getAgent(_asset: string): Promise<IndexedAgent | null>;
    getAgentByAgentId(_agentId: string | number | bigint): Promise<IndexedAgent | null>;
    getAgents(_options?: AgentQueryOptions): Promise<IndexedAgent[]>;
    getAgentsByOwner(_owner: string): Promise<IndexedAgent[]>;
    getAgentsByCollection(_collection: string): Promise<IndexedAgent[]>;
    getAgentByWallet(_wallet: string): Promise<IndexedAgent | null>;
    getLeaderboard(_options?: {
        collection?: string;
        minTier?: number;
        limit?: number;
        cursorSortKey?: string;
    }): Promise<IndexedAgent[]>;
    getCollectionPointers(_options?: CollectionPointerQueryOptions): Promise<CollectionPointerRecord[]>;
    getCollectionAssetCount(_col: string, _creator?: string): Promise<number>;
    getCollectionAssets(_col: string, _options?: CollectionAssetsQueryOptions): Promise<IndexedAgent[]>;
    getCollectionStats(_collection: string): Promise<CollectionStats | null>;
    getAllCollectionStats(): Promise<CollectionStats[]>;
    getGlobalStats(): Promise<GlobalStats>;
    getFeedbacks(_asset: string, _options?: {
        includeRevoked?: boolean;
        limit?: number;
        offset?: number;
    }): Promise<IndexedFeedback[]>;
    getFeedback(_asset: string, _client: string, _feedbackIndex: number | bigint): Promise<IndexedFeedback | null>;
    getFeedbackById(_feedbackId: string): Promise<IndexedFeedback | null>;
    getFeedbacksByClient(_client: string): Promise<IndexedFeedback[]>;
    getFeedbacksByTag(_tag: string): Promise<IndexedFeedback[]>;
    getFeedbacksByEndpoint(_endpoint: string): Promise<IndexedFeedback[]>;
    getAllFeedbacks(_options?: {
        includeRevoked?: boolean;
        limit?: number;
    }): Promise<IndexedFeedback[]>;
    getLastFeedbackIndex(_asset: string, _client: string): Promise<bigint>;
    getFeedbackResponsesFor(_asset: string, _client: string, _feedbackIndex: number | bigint, _limit?: number): Promise<IndexedFeedbackResponse[]>;
    getFeedbackResponsesByFeedbackId(_feedbackId: string, _limit?: number): Promise<IndexedFeedbackResponse[]>;
    getPendingValidations(_validator: string): Promise<IndexedValidation[]>;
    getAgentReputation(_asset: string): Promise<IndexedAgentReputation | null>;
    getLastFeedbackDigest(_asset: string): Promise<{
        digest: string | null;
        count: number;
    }>;
    getLastResponseDigest(_asset: string): Promise<{
        digest: string | null;
        count: number;
    }>;
    getLastRevokeDigest(_asset: string): Promise<{
        digest: string | null;
        count: number;
    }>;
    getFeedbacksAtIndices(_asset: string, _indices: number[]): Promise<Map<number, IndexedFeedback | null>>;
    getResponsesAtOffsets(_asset: string, _offsets: number[]): Promise<Map<number, IndexedFeedbackResponse | null>>;
    getRevocationsAtCounts(_asset: string, _revokeCounts: number[]): Promise<Map<number, IndexedRevocation | null>>;
    getReplayData(_asset: string, _chainType: 'feedback' | 'response' | 'revoke', _fromCount?: number, _toCount?: number, _limit?: number): Promise<ReplayDataPage>;
    getLatestCheckpoints(_asset: string): Promise<CheckpointSet>;
    triggerReplay(_asset: string): Promise<ServerReplayResult>;
}
export { NOT_CONFIGURED as INDEXER_NOT_CONFIGURED_MESSAGE };
//# sourceMappingURL=indexer-disabled.d.ts.map