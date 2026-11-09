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
import { PublicKey } from '@solana/web3.js';
import { ServiceType } from '../models/enums.js';
import { MUSEBOOK_DIRECTORY } from '../core/indexer-defaults.js';
export const MUSEBOOK_REGISTRATION_TYPE = 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1';
export const MUSEBOOK_HUB = MUSEBOOK_DIRECTORY.hub;
export const MUSEBOOK_REGISTRY = MUSEBOOK_DIRECTORY.registry;
/** Config object accepted by @musebook/discovery searchDirectory(). */
export function musebookDiscoveryConfig(overrides) {
    return {
        hub: overrides?.hub ?? MUSEBOOK_HUB,
        registry: overrides?.registry ?? MUSEBOOK_REGISTRY,
    };
}
/**
 * Map svm-8004 registration input into the Musebook / EIP-8004 document shape
 * used by @musebook/identity.buildRegistrationDocument().
 */
export function toMusebookRegistrationDocument(file, options) {
    const services = (file.services ?? []).map((svc) => {
        const mapped = {
            name: String(svc.type),
            endpoint: svc.value,
        };
        if (svc.meta && typeof svc.meta === 'object') {
            const meta = svc.meta;
            if (typeof meta.version === 'string')
                mapped.version = meta.version;
        }
        return mapped;
    });
    const oasf = services.find((svc) => svc.name === ServiceType.OASF || svc.name === 'OASF');
    if (oasf) {
        if (file.skills?.length)
            oasf.skills = [...file.skills];
        if (file.domains?.length)
            oasf.domains = [...file.domains];
    }
    return {
        type: MUSEBOOK_REGISTRATION_TYPE,
        name: file.name,
        description: file.description ?? '',
        image: file.image ?? '',
        services,
        active: options?.active ?? true,
        x402Support: options?.x402Support ?? services.some((svc) => /x402/i.test(svc.name) || /x402/i.test(svc.endpoint)),
        registrations: options?.agentId
            ? [{ agentId: options.agentId, agentRegistry: 'solana:101:metaplex' }]
            : [],
        supportedTrust: options?.supportedTrust ?? ['reputation'],
    };
}
/**
 * Map a Musebook / EIP-8004 registration document back into svm-8004
 * RegistrationFile input for buildRegistrationFileJson().
 */
export function fromMusebookRegistrationDocument(doc) {
    const oasf = doc.services.find((svc) => svc.name === ServiceType.OASF || svc.name === 'OASF');
    const services = doc.services.map((svc) => {
        const type = Object.values(ServiceType).includes(svc.name)
            ? svc.name
            : svc.name;
        const service = { type, value: svc.endpoint };
        if (svc.version)
            service.meta = { version: svc.version };
        return service;
    });
    return {
        name: doc.name,
        description: doc.description,
        image: doc.image,
        services,
        skills: oasf?.skills,
        domains: oasf?.domains,
    };
}
/** Narrow a @musebook/discovery DirectoryAgent-like record to an asset pubkey. */
export function directoryRecordAssetId(record) {
    const value = record.assetId ?? record.assetAddress ?? record.id ?? null;
    if (!value)
        return null;
    try {
        return new PublicKey(value).toBase58();
    }
    catch {
        return null;
    }
}
export { MUSEBOOK_DIRECTORY };
//# sourceMappingURL=musebook.js.map