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
import { Keypair, PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';
export type SignableTransaction = Transaction | VersionedTransaction;
/**
 * Minimal wallet surface used across SDK write paths.
 * Compatible with Solana Agent Kit v2 `BaseWallet` and wallet-adapter.
 */
export interface Svm8004Signer {
    publicKey: PublicKey;
    signTransaction<T extends SignableTransaction>(transaction: T): Promise<T>;
    signAllTransactions?<T extends SignableTransaction>(transactions: T[]): Promise<T[]>;
    signMessage?(message: Uint8Array): Promise<Uint8Array>;
    /**
     * Present only when this signer was created from a Keypair.
     * Lets synchronous helpers such as `Svm8004.sign()` keep working.
     * Never set this on wallet-adapter / Agent Kit wallets.
     */
    readonly keypair?: Keypair;
}
/** Solana Agent Kit v2 `BaseWallet` (and compatible wallet objects). */
export interface SolanaAgentKitWalletLike {
    publicKey: PublicKey;
    signTransaction<T extends Transaction | VersionedTransaction>(transaction: T): Promise<T>;
    signAllTransactions?<T extends Transaction | VersionedTransaction>(transactions: T[]): Promise<T[]>;
    signMessage?(message: Uint8Array): Promise<Uint8Array>;
}
/** Wallet-adapter style object (`publicKey` may be a base58 string). */
export interface WalletAdapterLike {
    publicKey: PublicKey | string;
    signTransaction<T extends Transaction | VersionedTransaction>(transaction: T): Promise<T>;
    signAllTransactions?<T extends Transaction | VersionedTransaction>(transactions: T[]): Promise<T[]>;
    signMessage?(message: Uint8Array): Promise<Uint8Array>;
}
export type SignerInput = Keypair | Svm8004Signer;
export declare function isKeypair(value: unknown): value is Keypair;
export declare function isSvm8004Signer(value: unknown): value is Svm8004Signer;
/**
 * Wrap a Keypair. `signTransaction` uses `partialSign` so existing
 * signatures (new-account keypairs) are preserved.
 */
export declare function fromKeypair(keypair: Keypair): Svm8004Signer;
/**
 * Adapt a Solana Agent Kit v2 wallet (`agent.wallet` / `BaseWallet`).
 */
export declare function fromSolanaAgentKitWallet(wallet: SolanaAgentKitWalletLike): Svm8004Signer;
/**
 * Adapt a wallet-adapter-style object (`publicKey` + `signTransaction`).
 */
export declare function fromWalletAdapter(wallet: WalletAdapterLike): Svm8004Signer;
/**
 * Normalize `Keypair | Svm8004Signer | undefined` for SDK / builder constructors.
 * Keypair remains a valid input (backward compatible).
 */
export declare function resolveSigner(signer?: SignerInput | null): Svm8004Signer | undefined;
export declare function requireSigner(signer: Svm8004Signer | undefined, message?: string): Svm8004Signer;
//# sourceMappingURL=signer.d.ts.map