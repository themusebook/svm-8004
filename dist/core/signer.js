/**
 * Wallet-agnostic signer used by svm-8004 write paths.
 *
 * The SDK still accepts a raw `@solana/web3.js` Keypair for backward
 * compatibility. Solana Agent Kit `BaseWallet` / `agent.wallet` and
 * wallet-adapter-style objects are adapted so plugin writes no longer
 * require exposing a secret key.
 *
 * Extra new-account Keypairs (for example the Metaplex Core asset minted
 * during `registerAgent`) are generated locally, partial-signed onto the
 * transaction, then the wallet signs.
 */
import { PublicKey, Transaction, } from '@solana/web3.js';
import nacl from 'tweetnacl';
function toPublicKey(value) {
    return value instanceof PublicKey ? value : new PublicKey(value);
}
export function isKeypair(value) {
    if (!value || typeof value !== 'object')
        return false;
    const candidate = value;
    return candidate.publicKey instanceof PublicKey && candidate.secretKey instanceof Uint8Array;
}
export function isSvm8004Signer(value) {
    if (!value || typeof value !== 'object')
        return false;
    const candidate = value;
    return (candidate.publicKey instanceof PublicKey &&
        typeof candidate.signTransaction === 'function');
}
/**
 * Wrap a Keypair. `signTransaction` uses `partialSign` so existing
 * signatures (new-account keypairs) are preserved.
 */
export function fromKeypair(keypair) {
    return {
        publicKey: keypair.publicKey,
        keypair,
        async signTransaction(transaction) {
            if (transaction instanceof Transaction) {
                transaction.partialSign(keypair);
                return transaction;
            }
            transaction.sign([keypair]);
            return transaction;
        },
        async signAllTransactions(transactions) {
            return Promise.all(transactions.map((tx) => this.signTransaction(tx)));
        },
        async signMessage(message) {
            return nacl.sign.detached(message, keypair.secretKey);
        },
    };
}
/**
 * Adapt a Solana Agent Kit v2 wallet (`agent.wallet` / `BaseWallet`).
 */
export function fromSolanaAgentKitWallet(wallet) {
    if (!wallet?.publicKey || typeof wallet.signTransaction !== 'function') {
        throw new Error('Solana Agent Kit wallet is missing publicKey or signTransaction. ' +
            'Pass a BaseWallet (agent.wallet) or a Keypair to createSvm8004Plugin({ signer }).');
    }
    return {
        publicKey: wallet.publicKey,
        signTransaction: (transaction) => wallet.signTransaction(transaction),
        signAllTransactions: wallet.signAllTransactions
            ? (transactions) => wallet.signAllTransactions(transactions)
            : async (transactions) => Promise.all(transactions.map((tx) => wallet.signTransaction(tx))),
        signMessage: wallet.signMessage
            ? (message) => wallet.signMessage(message)
            : undefined,
    };
}
/**
 * Adapt a wallet-adapter-style object (`publicKey` + `signTransaction`).
 */
export function fromWalletAdapter(wallet) {
    if (!wallet?.publicKey || typeof wallet.signTransaction !== 'function') {
        throw new Error('Wallet adapter is missing publicKey or signTransaction.');
    }
    const publicKey = toPublicKey(wallet.publicKey);
    return {
        publicKey,
        signTransaction: (transaction) => wallet.signTransaction(transaction),
        signAllTransactions: wallet.signAllTransactions
            ? (transactions) => wallet.signAllTransactions(transactions)
            : async (transactions) => Promise.all(transactions.map((tx) => wallet.signTransaction(tx))),
        signMessage: wallet.signMessage
            ? (message) => wallet.signMessage(message)
            : undefined,
    };
}
/**
 * Normalize `Keypair | Svm8004Signer | undefined` for SDK / builder constructors.
 * Keypair remains a valid input (backward compatible).
 */
export function resolveSigner(signer) {
    if (!signer)
        return undefined;
    if (isKeypair(signer))
        return fromKeypair(signer);
    if (isSvm8004Signer(signer))
        return signer;
    throw new Error('Unsupported signer. Pass a Keypair, Svm8004Signer, Solana Agent Kit wallet, or wallet adapter.');
}
export function requireSigner(signer, message) {
    if (!signer) {
        throw new Error(message ?? 'No signer configured - SDK is read-only.');
    }
    return signer;
}
//# sourceMappingURL=signer.js.map