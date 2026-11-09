/**
 * Integration helpers between svm-8004 and Musebook Agent Kit packages:
 *   @musebook/identity  — EIP-8004 registration documents + Asset Signer PDAs
 *   @musebook/discovery — musebook.trade directory search
 *   @musebook/wallet    — TransactionSigner interface (documented; not required)
 *
 * These helpers are pure mappings plus directory constants. They do not send
 * transactions or call mainnet. registry.musebook.trade is a directory UI,
 * not a 8004 indexer — see MUSEBOOK_DIRECTORY in indexer-defaults.
 */
import type { RegistrationFile } from '../models/interfaces.js';
import { MUSEBOOK_DIRECTORY } from '../core/indexer-defaults.js';
/** Mirrors @musebook/identity RegistrationService. */
export interface MusebookRegistrationService {
    name: string;
    endpoint: string;
    version?: string;
    skills?: string[];
    domains?: string[];
}
/** Mirrors @musebook/identity RegistrationDocument (EIP-8004 registration-v1). */
export interface MusebookRegistrationDocument {
    type: string;
    name: string;
    description: string;
    image: string;
    services: MusebookRegistrationService[];
    active: boolean;
    x402Support: boolean;
    registrations: Array<{
        agentId: string;
        agentRegistry: string;
    }>;
    supportedTrust: string[];
}
export declare const MUSEBOOK_REGISTRATION_TYPE = "https://eips.ethereum.org/EIPS/eip-8004#registration-v1";
export declare const MUSEBOOK_HUB: "https://musebook.trade";
export declare const MUSEBOOK_REGISTRY: "https://registry.musebook.trade";
/** Config object accepted by @musebook/discovery searchDirectory(). */
export declare function musebookDiscoveryConfig(overrides?: {
    hub?: string;
    registry?: string;
}): {
    hub: string;
    registry: string;
};
/**
 * Map svm-8004 registration input into the Musebook / EIP-8004 document shape
 * used by @musebook/identity.buildRegistrationDocument().
 */
export declare function toMusebookRegistrationDocument(file: RegistrationFile, options?: {
    agentId?: string;
    x402Support?: boolean;
    supportedTrust?: string[];
    active?: boolean;
}): MusebookRegistrationDocument;
/**
 * Map a Musebook / EIP-8004 registration document back into svm-8004
 * RegistrationFile input for buildRegistrationFileJson().
 */
export declare function fromMusebookRegistrationDocument(doc: MusebookRegistrationDocument): RegistrationFile;
/** Narrow a @musebook/discovery DirectoryAgent-like record to an asset pubkey. */
export declare function directoryRecordAssetId(record: {
    assetId?: string | null;
    assetAddress?: string | null;
    id?: string | null;
}): string | null;
export { MUSEBOOK_DIRECTORY };
//# sourceMappingURL=musebook.d.ts.map