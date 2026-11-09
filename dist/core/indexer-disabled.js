/**
 * Placeholder indexer used when no endpoint or preset is configured.
 * Reads should fall back on-chain; indexer-only methods throw a clear error.
 */
import { IndexerUnavailableError } from './indexer-errors.js';
const NOT_CONFIGURED = 'No SVM-8004 indexer configured. Pass indexerGraphqlUrl (or indexerUrl), set INDEXER_GRAPHQL_URL / INDEXER_URL, or use indexerPreset: "quantulabs-public". A Musebook 8004 indexer is not available yet; registry.musebook.trade is a directory UI, not this API.';
function notConfigured() {
    throw new IndexerUnavailableError(NOT_CONFIGURED);
}
export class DisabledIndexerClient {
    getBaseUrl() {
        return '';
    }
    isAvailable() {
        return Promise.resolve(false);
    }
    getAgent(_asset) {
        return notConfigured();
    }
    getAgentByAgentId(_agentId) {
        return notConfigured();
    }
    getAgents(_options) {
        return notConfigured();
    }
    getAgentsByOwner(_owner) {
        return notConfigured();
    }
    getAgentsByCollection(_collection) {
        return notConfigured();
    }
    getAgentByWallet(_wallet) {
        return notConfigured();
    }
    getLeaderboard(_options) {
        return notConfigured();
    }
    getCollectionPointers(_options) {
        return notConfigured();
    }
    getCollectionAssetCount(_col, _creator) {
        return notConfigured();
    }
    getCollectionAssets(_col, _options) {
        return notConfigured();
    }
    getCollectionStats(_collection) {
        return notConfigured();
    }
    getAllCollectionStats() {
        return notConfigured();
    }
    getGlobalStats() {
        return notConfigured();
    }
    getFeedbacks(_asset, _options) {
        return notConfigured();
    }
    getFeedback(_asset, _client, _feedbackIndex) {
        return notConfigured();
    }
    getFeedbackById(_feedbackId) {
        return notConfigured();
    }
    getFeedbacksByClient(_client) {
        return notConfigured();
    }
    getFeedbacksByTag(_tag) {
        return notConfigured();
    }
    getFeedbacksByEndpoint(_endpoint) {
        return notConfigured();
    }
    getAllFeedbacks(_options) {
        return notConfigured();
    }
    getLastFeedbackIndex(_asset, _client) {
        return notConfigured();
    }
    getFeedbackResponsesFor(_asset, _client, _feedbackIndex, _limit) {
        return notConfigured();
    }
    getFeedbackResponsesByFeedbackId(_feedbackId, _limit) {
        return notConfigured();
    }
    getPendingValidations(_validator) {
        return notConfigured();
    }
    getAgentReputation(_asset) {
        return notConfigured();
    }
    getLastFeedbackDigest(_asset) {
        return notConfigured();
    }
    getLastResponseDigest(_asset) {
        return notConfigured();
    }
    getLastRevokeDigest(_asset) {
        return notConfigured();
    }
    getFeedbacksAtIndices(_asset, _indices) {
        return notConfigured();
    }
    getResponsesAtOffsets(_asset, _offsets) {
        return notConfigured();
    }
    getRevocationsAtCounts(_asset, _revokeCounts) {
        return notConfigured();
    }
    getReplayData(_asset, _chainType, _fromCount, _toCount, _limit) {
        return notConfigured();
    }
    getLatestCheckpoints(_asset) {
        return notConfigured();
    }
    triggerReplay(_asset) {
        return notConfigured();
    }
}
export { NOT_CONFIGURED as INDEXER_NOT_CONFIGURED_MESSAGE };
//# sourceMappingURL=indexer-disabled.js.map