import * as stream from "stream";
import * as express from "express";
import * as ws from "ws";
import * as http from "http";
import * as events from "events";

declare module "ln-service" {
  export type AuthenticatedLND = {
    autopilot: any;
    chain: any;
    default: any;
    invoices: any;
    router: any;
    signer: any;
    tower_client: any;
    tower_server: any;
    wallet: any;
    version: any;
  };
  export type UnauthenticatedLND = {
    unlocker: any;
  };

  export type LNServiceError<TDetails = any> = [number, string, TDetails];

  export type MethodWithPromiseOrCallback<
    TArgs = {},
    TResult = void,
    TErrorDetails = any
  > = {
    (args: TArgs): Promise<TResult>;
    (
      args: TArgs,
      callback: (
        error: LNServiceError<TErrorDetails> | undefined | null,
        result: TResult extends void ? undefined : TResult
      ) => void
    ): void;
  };
  export type AuthenticatedLNDMethod<
    TArgs = {},
    TResult = void,
    TErrorDetails = any
  > = MethodWithPromiseOrCallback<
    TArgs & { lnd: AuthenticatedLND },
    TResult,
    TErrorDetails
  >;
  export type UnauthenticatedLNDMethod<
    TArgs = {},
    TResult = void,
    TErrorDetails = any
  > = MethodWithPromiseOrCallback<
    TArgs & { lnd: UnauthenticatedLND },
    TResult,
    TErrorDetails
  >;
  export type AuthenticatedLNDSubscription<TArgs = {}> = (
    args: TArgs & { lnd: AuthenticatedLND }
  ) => events.EventEmitter;

  export type AddPeerArgs = {
    /** Add Peer as Temporary Peer, default: `false` */
    is_temporary?: boolean;
    /** Public Key Hex */
    public_key: string;
    /** Retry Count */
    retry_count?: number;
    /** Delay Retry By Milliseconds */
    retry_delay?: number;
    /** Host Network Address And Optional Port, format: ip:port */
    socket: string;
    /** Connection Attempt Timeout Milliseconds */
    timeout?: number;
  };
  /**
   * Add a peer if possible (not self, or already connected)
   *
   * Requires `peers:write` permission
   *
   * `timeout` is not supported in LND 0.11.1 and below
   */
  export const addPeer: AuthenticatedLNDMethod<AddPeerArgs>;

  export type AuthenticatedLNDgRPCArgs = {
    cert?: string;
    macaroon: string;
    socket?: string;
  };
  export type AuthenticatedLNDgRPCResult = {
    lnd: AuthenticatedLND;
  };
  /**
   * Initiate a gRPC API Methods Object for authenticated methods
   *
   * Both the `cert` and `macaroon` expect the entire serialized LND generated file
   *
   * See: https://github.com/alexbosworth/ln-service#authenticatedLndGrpc
   */
  export const authenticatedLndGrpc: (
    args: AuthenticatedLNDgRPCArgs
  ) => AuthenticatedLNDgRPCResult;

  export type BroadcastChainTransactionArgs = {
    /** Transaction Label */
    description?: string;
    /** Transaction Hex */
    transaction: string;
  };
  export type BroadcastChainTransactionResult = {
    id: string;
  };
  /**
   * Publish a raw blockchain transaction to Blockchain network peers
   *
   * Requires LND built with `walletrpc` tag
   */
  export const broadcastChainTransaction: AuthenticatedLNDMethod<
    BroadcastChainTransactionArgs,
    BroadcastChainTransactionResult
  >;

  export type CalculateHopsArgs = {
    channels: {
      /** Capacity Tokens Number */
      capacity: number;
      /** Standard Channel Id String */
      id: string;
      policies: {
        /** Base Fee Millitokens String */
        base_fee_mtokens: string;
        /** CLTV Delta Number */
        cltv_delta: string;
        /** Fee Rate Number */
        fee_rate: string;
        /** Channel is Disabled Bool */
        is_disabled: string;
        /** Maximum HTLC Millitokens String */
        max_htlc_mtokens: string;
        /** Minimum HTLC Millitokens String */
        min_htlc_mtokens: string;
        /** Public Key Hex String */
        public_key: string;
      }[];
    }[];
    /** End Public Key Hex */
    end: string;
    ignore?: {
      /** Standard Format Channel Id */
      channel?: string;
      /** Public Key Hex */
      public_key: string;
    }[];
    /** Millitokens */
    mtokens: number;
    /** Start Public Key Hex */
    start: string;
  };
  export type CalculateHopsResult = {
    hops?: {
      /** Base Fee Millitokens */
      base_fee_mtokens: string;
      /** Standard Channel Id */
      channel: string;
      /** Channel Capacity Tokens */
      channel_capacity: number;
      /** CLTV Delta */
      cltv_delta: number;
      /** Fee Rate */
      fee_rate: number;
      /** Public Key Hex */
      public_key: string;
    }[];
  };
  /**
   * Calculate hops between start and end nodes
   */
  export const calculateHops: MethodWithPromiseOrCallback<
    CalculateHopsArgs,
    CalculateHopsResult
  >;

  export type CalculatePathsArgs = {
    channels: {
      /** Capacity Tokens Number */
      capacity: number;
      /** Standard Channel Id String */
      id: string;
      policies: {
        /** Base Fee Millitokens String */
        base_fee_mtokens: string;
        /** CLTV Delta Number */
        cltv_delta: string;
        /** Fee Rate Number */
        fee_rate: string;
        /** Channel is Disabled Bool */
        is_disabled: string;
        /** Maximum HTLC Millitokens String */
        max_htlc_mtokens: string;
        /** Minimum HTLC Millitokens String */
        min_htlc_mtokens: string;
        /** Public Key Hex String */
        public_key: string;
      }[];
    }[];
    /** End Public Key Hex */
    end: string;
    /** Paths To Return Limit */
    limit?: number;
    /** Millitokens */
    mtokens: number;
    /** Start Public Key Hex */
    start: string;
  };
  export type CalculatePathsResult = {
    paths?: {
      hops: {
        /** Base Fee Millitokens */
        base_fee_mtokens: string;
        /** Standard Channel Id */
        channel: string;
        /** Channel Capacity Tokens */
        channel_capacity: number;
        /** CLTV Delta */
        cltv_delta: number;
        /** Fee Rate */
        fee_rate: number;
        /** Public Key Hex */
        public_key: string;
      }[];
    }[];
  };
  /**
   * Calculate multiple routes to a destination
   */
  export const calculatePaths: MethodWithPromiseOrCallback<
    CalculatePathsArgs,
    CalculateHopsResult
  >;

  export type CancelHodlInvoiceArgs = {
    /** Payment Preimage Hash Hex */
    id: string;
  };
  /**
   * Cancel an invoice
   *
   * This call can cancel both HODL invoices and also void regular invoices
   *
   * Requires LND built with `invoicesrpc`
   *
   * Requires `invoices:write` permission
   */
  export const cancelHodlInvoice: AuthenticatedLNDMethod<CancelHodlInvoiceArgs>;

  export type CancelPendingChannelArgs = {
    /** Pending Channel Id Hex */
    id: string;
  };
  /**
   * Cancel an external funding pending channel
   */
  export const cancelPendingChannel: AuthenticatedLNDMethod<CancelPendingChannelArgs>;

  export type ChangePasswordArgs = {
    /** Current Password */
    current_password: string;
    /** New Password */
    new_password: string;
  };
  /**
   * Change wallet password
   *
   * Requires locked LND and unauthenticated LND connection
   */
  export const changePassword: UnauthenticatedLNDMethod<ChangePasswordArgs>;

  export type CloseChannelArgs = {
    /** Request Sending Local Channel Funds To Address */
    address?: string;
    /** Standard Format Channel Id */
    id?: string;
    /** Is Force Close */
    is_force_close?: boolean;
    /** Peer Public Key */
    public_key?: string;
    /** Peer Socket */
    socket?: string;
    /** Confirmation Target */
    target_confirmations?: number;
    /** Tokens Per Virtual Byte */
    tokens_per_vbyte?: number;
    /** Transaction Id Hex */
    transaction_id?: string;
    /** Transaction Output Index */
    transaction_vout?: number;
  };
  export type CloseChannelResult = {
    /** Closing Transaction Id Hex */
    transaction_id: string;
    /** Closing Transaction Vout */
    transaction_vout: number;
  };
  /**
   * Close a channel.
   *
   * Either an id or a transaction id / transaction output index is required
   *
   * If cooperatively closing, pass a public key and socket to connect
   *
   * Requires `info:read`, `offchain:write`, `onchain:write`, `peers:write` permissions
   */
  export const closeChannel: AuthenticatedLNDMethod<
    CloseChannelArgs,
    CloseChannelResult
  >;

  export type ConnectWatchtowerArgs = {
    /** Watchtower Public Key Hex */
    public_key: string;
    /** Network Socket Address IP:PORT */
    socket: string;
  };
  /**
   * Connect to a watchtower
   *
   * This method requires LND built with `wtclientrpc` build tag
   *
   * Requires `offchain:write` permission
   */
  export const connectWatchtower: AuthenticatedLNDMethod<ConnectWatchtowerArgs>;

  export type CreateChainAddressArgs = {
    /** Receive Address Type */
    format: "np2wpkh" | "p2wpkh";
    /** Get As-Yet Unused Address */
    is_unused?: boolean;
  };
  export type CreateChainAddressResult = {
    /** Chain Address */
    address: string;
  };
  /**
   * Create a new receive address.
   *
   * Requires address:write permission
   */
  export const createChainAddress: AuthenticatedLNDMethod<
    CreateChainAddressArgs,
    CreateChainAddressResult
  >;

  export type CreateHodlInvoiceArgs = {
    /** Final CLTV Delta */
    cltv_delta?: number;
    /** Invoice Description */
    description?: string;
    /** Hashed Description of Payment Hex */
    description_hash?: string;
    /** Expires At ISO 8601 Date */
    expires_at?: string;
    /** Payment Hash Hex */
    id?: string;
    /** Is Fallback Address Included */
    is_fallback_included?: boolean;
    /** Is Fallback Address Nested */
    is_fallback_nested?: boolean;
    /** Invoice Includes Private Channels */
    is_including_private_channels?: boolean;
    /** Millitokens */
    mtokens?: string;
    /** Tokens */
    tokens?: number;
  };
  export type CreateHodlInvoiceResult = {
    /** Backup Address String */
    chain_address?: string;
    /** ISO 8601 Date String */
    created_at: string;
    /** Description String */
    description: string;
    /** Payment Hash Hex String */
    id: string;
    /** Millitokens Number */
    mtokens: number;
    /** BOLT 11 Encoded Payment Request String */
    request: string;
    /** Hex Encoded Payment Secret String */
    secret?: string;
    /** Tokens Number */
    tokens: number;
  };
  /**
   * Create HODL invoice. This invoice will not settle automatically when an HTLC arrives. It must be settled separately with the secret preimage.
   *
   * Warning: make sure to cancel the created invoice before its CLTV timeout.
   *
   * Requires LND built with `invoicesrpc` tag
   *
   * Requires `address:write`, `invoices:write` permission
   */
  export const createHodlInvoice: AuthenticatedLNDMethod<
    CreateHodlInvoiceArgs,
    CreateHodlInvoiceResult
  >;

  export type CreateInvoiceArgs = {
    /** CLTV Delta */
    cltv_delta?: number;
    /** Invoice Description */
    description?: string;
    /** Hashed Description of Payment Hex */
    description_hash?: string;
    /** Expires At ISO 8601 Date */
    expires_at?: string;
    /** Is Fallback Address Included */
    is_fallback_included?: boolean;
    /** Is Fallback Address Nested */
    is_fallback_nested?: boolean;
    /** Invoice Includes Private Channels */
    is_including_private_channels?: boolean;
    /** Payment Preimage Hex */
    secret?: string;
    /** Millitokens */
    mtokens?: string;
    /** Tokens */
    tokens?: number;
  };
  export type CreateInvoiceResult = {
    /** Backup Address */
    chain_address?: string;
    /** ISO 8601 Date */
    created_at: string;
    /** Description */
    description?: string;
    /** Payment Hash Hex */
    id: string;
    /** Millitokens */
    mtokens?: string;
    /** BOLT 11 Encoded Payment Request */
    request: string;
    /** Hex Encoded Payment Secret */
    secret: string;
    /** Tokens */
    tokens?: number;
  };
  /**
   * Create a Lightning invoice.
   *
   * Requires `address:write`, `invoices:write` permissio
   */
  export const createInvoice: AuthenticatedLNDMethod<
    CreateInvoiceArgs,
    CreateInvoiceResult
  >;

  export type CreateSeedArgs = {
    /** Seed Passphrase */
    passphrase?: string;
  };
  export type CreateSeedResult = {
    /** Cipher Seed Mnemonic */
    seed: string;
  };
  /**
   * Create a wallet seed
   *
   * Requires unlocked lnd and unauthenticated LND
   */
  export const createSeed: UnauthenticatedLNDMethod<
    CreateSeedArgs,
    CreateSeedResult
  >;

  export type CreateSignedRequestArgs = {
    /** Destination Public Key Hex */
    destination: string;
    /** Request Human Readable Part */
    hrp: string;
    /** Request Hash Signature Hex */
    signature: string;
    /** Request Tag Words */
    tags: number[];
  };
  export type CreateSignedResult = {
    /** BOLT 11 Encoded Payment Request */
    request: string;
  };
  /**
   * Assemble a signed payment request
   */
  export const createSignedRequest: (
    args: CreateSignedRequestArgs
  ) => CreateSignedResult;

  export type CreateUnsignedRequestArgs = {
    /** Chain Addresses */
    chain_addresses?: string[];
    /** CLTV Delta */
    cltv_delta?: number;
    /** Invoice Creation Date ISO 8601 */
    created_at?: string;
    /** Description */
    description?: string;
    /** Description Hash Hex */
    description_hash?: string;
    /** Public Key */
    destination: string;
    /** ISO 8601 Date */
    expires_at?: string;
    features: {
      /** BOLT 09 Feature Bit */
      bit: number;
    }[];
    /** Preimage SHA256 Hash Hex */
    id: string;
    /** Requested Milli-Tokens Value (can exceed number limit) */
    mtokens?: string;
    /** Network Name */
    network: string;
    /** Payment Identifier Hex */
    payment?: string;
    routes?: {
      /** Base Fee Millitokens */
      base_fee_mtokens?: string;
      /** Standard Format Channel Id */
      channel?: string;
      /** Final CLTV Expiration Blocks Delta */
      cltv_delta?: number;
      /** Fees Charged in Millitokens Per Million */
      fee_rate?: number;
      /** Forward Edge Public Key Hex */
      public_key: string;
    }[][];
    /** Requested Chain Tokens Number (note: can differ from mtokens) */
    tokens?: number;
  };
  export type CreateUnsignedRequestResult = {
    /** Payment Request Signature Hash Hex */
    hash: string;
    /** Human Readable Part of Payment Request */
    hrp: string;
    /** Signature Hash Preimage Hex */
    preimage: string;
    /** Data Tag Numbers */
    tags: number[];
  };
  /**
   * Create an unsigned payment request
   */
  export const createUnsignedRequest: (
    args: CreateUnsignedRequestArgs
  ) => CreateUnsignedRequestResult;

  export type CreateWalletArgs = {
    /** AEZSeed Encryption Passphrase */
    passphrase?: string;
    /** Wallet Password */
    password: string;
    /** Seed Mnemonic */
    seed: string;
  };
  /**
   * Create a wallet
   *
   * Requires unlocked lnd and unauthenticated LND
   */
  export const createWallet: UnauthenticatedLNDMethod<CreateWalletArgs>;

  export type DecodePaymentRequestArgs = {
    /** BOLT 11 Payment Request */
    request: string;
  };
  export type DecodePaymentRequestResult = {
    /** Fallback Chain Address */
    chain_address: string;
    /** Final CLTV Delta */
    cltv_delta?: number;
    /** Payment Description */
    description: string;
    /** Payment Longer Description Hash */
    description_hash: string;
    /** Public Key */
    destination: string;
    /** ISO 8601 Date */
    expires_at: string;
    features: {
      /** BOLT 09 Feature Bit */
      bit: number;
      /** Feature is Known */
      is_known: boolean;
      /** Feature Support is Required To Pay */
      is_required: boolean;
      /** Feature Type */
      type: string;
    }[];
    /** Payment Hash */
    id: string;
    /** Requested Millitokens */
    mtokens: string;
    /** Payment Identifier Hex Encoded */
    payment?: string;
    routes: {
      /** Base Routing Fee In Millitokens */
      base_fee_mtokens?: string;
      /** Standard Format Channel Id */
      channel?: string;
      /** CLTV Blocks Delta */
      cltv_delta?: number;
      /** Fees Charged in Millitokens Per Million */
      fee_rate?: number;
      /** Forward Edge Public Key Hex */
      public_key: string;
    }[][];
    /** Requested Tokens Rounded Up */
    safe_tokens: number;
    /** Requested Tokens Rounded Down */
    tokens: number;
  };
  /**
   * Get decoded payment request
   *
   * Requires `offchain:read` permission
   */
  export const decodePaymentRequest: AuthenticatedLNDMethod<
    DecodePaymentRequestArgs,
    DecodePaymentRequestResult
  >;

  /**
   * Delete all forwarding reputations
   *
   * Requires `offchain:write` permissio
   */
  export const deleteForwardingReputations: AuthenticatedLNDMethod;

  /**
   * Delete all records of payments
   *
   * Requires `offchain:write` permission
   */
  export const deletePayments: AuthenticatedLNDMethod;

  export type DiffieHellmanComputeSecretArgs = {
    /** Key Family */
    key_family?: number;
    /** Key Index */
    key_index?: number;
    /** Public Key Hex */
    partner_public_key: string;
  };
  export type DiffieHellmanComputeSecretResult = {
    /** Shared Secret Hex */
    secret: string;
  };
  /**
   * Derive a shared secret
   *
   * Key family and key index default to 6 and 0, which is the node identity key
   *
   * Requires LND built with `signerrpc` build tag
   *
   * Requires `signer:generate` permission
   */
  export const diffieHellmanComputeSecret: AuthenticatedLNDMethod<
    DiffieHellmanComputeSecretArgs,
    DiffieHellmanComputeSecretResult
  >;

  export type DisconnectWatchtowerArgs = {
    /** Watchtower Public Key Hex */
    public_key: string;
  };
  /**
   * Disconnect a watchtower
   *
   * Requires LND built with `wtclientrpc` build tag
   *
   * Requires `offchain:write` permission
   */
  export const disconnectWatchtower: AuthenticatedLNDMethod<DisconnectWatchtowerArgs>;

  export type FundPendingChannelsArgs = {
    /** Pending Channel Id Hex */
    channels: string[];
    /** Signed Funding Transaction PSBT Hex */
    funding: string;
  };
  /**
   * Fund pending channels
   *
   * Requires `offchain:write`, `onchain:write` permission
   */
  export const fundPendingChannels: AuthenticatedLNDMethod<FundPendingChannelsArgs>;

  export type FundPSBTArgs = {
    /** Chain Fee Tokens Per Virtual Byte */
    fee_tokens_per_vbyte?: number;
    inputs?: {
      /** Unspent Transaction Id Hex */
      transaction_id: string;
      /** Unspent Transaction Output Index */
      transaction_vout: number;
    }[];
    outputs?: {
      /** Chain Address */
      address: string;
      /** Send Tokens Tokens */
      tokens: number;
    }[];
    /** Confirmations To Wait */
    target_confirmations?: number;
    /** Existing PSBT Hex */
    psbt?: string;
  };
  export type FundPSBTResult = {
    inputs: {
      /** UTXO Lock Expires At ISO 8601 Date */
      lock_expires_at?: string;
      /** UTXO Lock Id Hex */
      lock_id?: string;
      /** Unspent Transaction Id Hex */
      transaction_id: string;
      /** Unspent Transaction Output Index */
      transaction_vout: number;
    }[];
    outputs: {
      /** Spends To a Generated Change Output */
      is_change: boolean;
      /** Output Script Hex */
      output_script: string;
      /** Send Tokens Tokens */
      tokens: number;
    }[];
    /** Unsigned PSBT Hex */
    psbt: string;
  };
  /**
   * Lock and optionally select inputs to a partially signed transaction
   *
   * Specify outputs or PSBT with the outputs encoded
   *
   * If there are no inputs passed, internal UTXOs will be selected and locked
   *
   * Requires `onchain:write` permission
   *
   * Requires LND built with `walletrpc` tag
   *
   * This method is not supported in LND 0.11.1 and belo
   */
  export const fundPsbt: AuthenticatedLNDMethod<FundPSBTArgs, FundPSBTResult>;

  export type GetAccessIdsResult = {
    /** Root Access Id Numbers */
    ids: number[];
  };

  /**
   * Get outstanding access ids given out
   *
   * Note: this method is not supported in LND versions 0.11.1 and below
   *
   * Requires `macaroon:read` permission
   */
  export const getAccessIds: AuthenticatedLNDMethod<{}, GetAccessIdsResult>;

  export type GetAutopilotArgs = {
    /** Get Score For Public Key Hex */
    node_scores?: string[];
  };
  export type GetAutopilotResult = {
    /** Autopilot is Enabled */
    is_enabled: boolean;
    nodes: {
      /** Local-adjusted Pref Attachment Score */
      local_preferential_score: number;
      /** Local-adjusted Externally Set Score */
      local_score: number;
      /** Preferential Attachment Score */
      preferential_score: number;
      /** Node Public Key Hex */
      public_key: string;
      /** Externally Set Score */
      score: number;
      /** Combined Weighted Locally-Adjusted Score */
      weighted_local_score: number;
      /** Combined Weighted Score */
      weighted_score: number;
    }[];
  };
  /**
	 * Get Autopilot status
	 * 
	 * Optionally, get the score of nodes as considered by the autopilot.
Local scores reflect an internal scoring that includes local channel info
	 * 
	 * Permission `info:read` is required
	 */
  export const getAutopilot: AuthenticatedLNDMethod<
    GetAutopilotArgs,
    GetAutopilotResult
  >;

  export type GetBackupArgs = {
    /** Funding Transaction Id Hex */
    transaction_id: string;
    /** Funding Transaction Output Index */
    transaction_vout: number;
  };
  export type GetBackupResult = {
    /** Channel Backup Hex */
    backup: string;
  };
  /**
   * Get the static channel backup for a channel
   *
   * Requires `offchain:read` permission
   */
  export const getBackup: AuthenticatedLNDMethod<
    GetBackupArgs,
    GetBackupResult
  >;

  export type GetBackupsResult = {
    /** All Channels Backup Hex */
    backup: string;
    channels: {
      /** Individualized Channel Backup Hex */
      backup: string;
      /** Channel Funding Transaction Id Hex */
      transaction_id: string;
      /** Channel Funding Transaction Output Index */
      transaction_vout: number;
    };
  };
  /**
   * Get all channel backups
   *
   * Requires `offchain:read` permission
   */
  export const getBackups: AuthenticatedLNDMethod<{}, GetBackupsResult>;

  export type GetChainBalanceResult = {
    /** Confirmed Chain Balance Tokens */
    chain_balance: number;
  };
  /**
   * Get balance on the chain.
   *
   * Requires `onchain:read` permission
   */
  export const getChainBalance: AuthenticatedLNDMethod<
    {},
    GetChainBalanceResult
  >;

  export type GetChainFeeEstimateArgs = {
    send_to: {
      /** Address */
      address: string;
      /** Tokens */
      tokens: number;
    }[];
    /** Target Confirmations */
    target_confirmations?: number;
  };
  export type GetChainFeeEstimateResult = {
    /** Total Fee Tokens */
    fee: number;
    /** Fee Tokens Per VByte */
    tokens_per_vbyte: number;
  };
  /**
   * Get a chain fee estimate for a prospective chain send
   *
   * Requires `onchain:read` permission
   */
  export const getChainFeeEstimate: AuthenticatedLNDMethod<
    GetChainFeeEstimateArgs,
    GetChainFeeEstimateResult
  >;

  export type GetChainFeeRateArgs = {
    /** Future Blocks Confirmation */
    confirmation_target?: number;
  };
  export type GetChainFeeRateResult = {
    /** Tokens Per Virtual Byte */
    tokens_per_vbyte: number;
  };
  /**
   * Get chain fee rate estimate
   *
   * Requires LND built with `walletrpc` tag
   *
   * Requires `onchain:read` permission
   */
  export const getChainFeeRate: AuthenticatedLNDMethod<
    GetChainFeeRateArgs,
    GetChainFeeRateResult
  >;

  export type GetChainTransactionsArgs = {
    /** Confirmed After Current Best Chain Block Height */
    after?: number;
    /** Confirmed Before Current Best Chain Block Height */
    before?: number;
  };
  export type GetChainTransactionsResult = {
    transactions: {
      /** Block Hash */
      block_id?: string;
      /** Confirmation Count */
      confirmation_count?: number;
      /** Confirmation Block Height */
      confirmation_height?: number;
      /** Created ISO 8601 Date */
      created_at: string;
      /** Transaction Label */
      description?: string;
      /** Fees Paid Tokens */
      fee?: number;
      /** Transaction Id */
      id: string;
      /** Is Confirmed */
      is_confirmed: boolean;
      /** Transaction Outbound */
      is_outgoing: boolean;
      /** Addresses */
      output_addresses: string[];
      /** Tokens Including Fee */
      tokens: number;
      /** Raw Transaction Hex */
      transaction?: string;
    }[];
  };
  /**
   * Get chain transactions.
   *
   * Requires `onchain:read` permission
   */
  export const getChainTransactions: AuthenticatedLNDMethod<
    GetChainTransactionsArgs,
    GetChainTransactionsResult
  >;

  export type GetChannelBalanceResult = {
    /** Channels Balance Tokens */
    channel_balance: number;
    /** Channels Balance Millitokens */
    channel_balance_mtokens?: string;
    /** Inbound Liquidity Tokens */
    inbound?: number;
    /** Inbound Liquidity Millitokens */
    inbound_mtokens?: string;
    /** Pending On-Chain Channels Balance Tokens */
    pending_balance: number;
    /** Pending On-Chain Inbound Liquidity Tokens */
    pending_inbound?: number;
    /** In-Flight Tokens */
    unsettled_balance?: number;
    /** In-Flight Millitokens */
    unsettled_balance_mtokens?: number;
  };
  /**
   * Get balance across channels.
   *
   * Requires `offchain:read` permission
   *
   * `channel_balance_mtokens` is not supported on LND 0.11.1 and below
   *
   * `inbound` and `inbound_mtokens` are not supported on LND 0.11.1 and below
   *
   * `pending_inbound` is not supported on LND 0.11.1 and below
   *
   * `unsettled_balance` is not supported on LND 0.11.1 and below
   *
   * `unsettled_balance_mtokens` is not supported on LND 0.11.1 and below
   */
  export const getChannelBalance: AuthenticatedLNDMethod<
    {},
    GetChannelBalanceResult
  >;

  export type GetChannelArgs = {
    /** Standard Format Channel Id */
    id: string;
  };
  export type GetChannelResult = {
    /** Maximum Tokens */
    capacity: number;
    /** Standard Format Channel Id */
    id: string;
    policies: {
      /** Base Fee Millitokens */
      base_fee_mtokens?: string;
      /** Locktime Delta */
      cltv_delta?: number;
      /** Fees Charged Per Million Millitokens */
      fee_rate?: number;
      /** Channel Is Disabled */
      is_disabled?: boolean;
      /** Maximum HTLC Millitokens Value */
      max_htlc_mtokens?: string;
      /** Minimum HTLC Millitokens Value */
      min_htlc_mtokens?: string;
      /** Node Public Key */
      public_key: string;
      /** Policy Last Updated At ISO 8601 Date */
      updated_at?: string;
    }[];
    /** Transaction Id Hex */
    transaction_id: string;
    /** Transaction Output Index */
    transaction_vout: number;
    /** Last Update Epoch ISO 8601 Date */
    updated_at?: string;
  };
  /**
   * Get graph information about a channel on the network
   *
   * Requires `info:read` permission
   */
  export const getChannel: AuthenticatedLNDMethod<
    GetChannelArgs,
    GetChannelResult
  >;

  export type GetChannelsArgs = {
    /** Limit Results To Only Active Channels */
    is_active?: boolean;
    /** Limit Results To Only Offline Channels */
    is_offline?: boolean;
    /** Limit Results To Only Private Channels */
    is_private?: boolean;
    /** Limit Results To Only Public Channels */
    is_public?: boolean;
    /** Only Channels With Public Key Hex */
    partner_public_key?: string;
  };
  export type GetChannelsResult = {
    channels: {
      /** Channel Token Capacity */
      capacity: number;
      /** Commit Transaction Fee */
      commit_transaction_fee: number;
      /** Commit Transaction Weight */
      commit_transaction_weight: number;
      /** Coop Close Restricted to Address */
      cooperative_close_address?: string;
      /** Prevent Coop Close Until Height */
      cooperative_close_delay_height?: number;
      /** Standard Format Channel Id */
      id: string;
      /** Channel Active */
      is_active: boolean;
      /** Channel Is Closing */
      is_closing: boolean;
      /** Channel Is Opening */
      is_opening: boolean;
      /** Channel Partner Opened Channel */
      is_partner_initiated: boolean;
      /** Channel Is Private */
      is_private: boolean;
      /** Remote Key Is Static */
      is_static_remote_key: boolean;
      /** Local Balance Tokens */
      local_balance: number;
      /** Local CSV Blocks Delay */
      local_csv?: number;
      /** Remote Non-Enforceable Amount Tokens */
      local_dust?: number;
      /** Local Initially Pushed Tokens */
      local_given?: number;
      /** Local Maximum Attached HTLCs */
      local_max_htlcs?: number;
      /** Local Maximum Pending Millitokens */
      local_max_pending_mtokens?: string;
      /** Local Minimum HTLC Millitokens */
      local_min_htlc_mtokens?: string;
      /** Local Reserved Tokens */
      local_reserve: number;
      /** Channel Partner Public Key */
      partner_public_key: string;
      pending_payments: {
        /** Payment Preimage Hash Hex */
        id: string;
        /** Forward Inbound From Channel Id */
        in_channel?: string;
        /** Payment Index on Inbound Channel */
        in_payment?: number;
        /** Payment is a Forward */
        is_forward?: boolean;
        /** Payment Is Outgoing */
        is_outgoing: boolean;
        /** Forward Outbound To Channel Id */
        out_channel?: string;
        /** Payment Index on Outbound Channel */
        out_payment?: number;
        /** Payment Attempt Id */
        payment?: number;
        /** Chain Height Expiration */
        timeout: number;
        /** Payment Tokens */
        tokens: number;
      }[];
      /** Received Tokens */
      received: number;
      /** Remote Balance Tokens */
      remote_balance: number;
      /** Remote CSV Blocks Delay */
      remote_csv?: number;
      /** Remote Non-Enforceable Amount Tokens */
      remote_dust?: number;
      /** Remote Initially Pushed Tokens */
      remote_given?: number;
      /** Remote Maximum Attached HTLCs */
      remote_max_htlcs?: number;
      /** Remote Maximum Pending Millitokens */
      remote_max_pending_mtokens?: string;
      /** Remote Minimum HTLC Millitokens */
      remote_min_htlc_mtokens?: string;
      /** Remote Reserved Tokens */
      remote_reserve: number;
      /** Sent Tokens */
      sent: number;
      /** Monitoring Uptime Channel Down Milliseconds */
      time_offline?: number;
      /** Monitoring Uptime Channel Up Milliseconds */
      time_online?: number;
      /** Blockchain Transaction Id */
      transaction_id: string;
      /** Blockchain Transaction Vout */
      transaction_vout: number;
      /** Unsettled Balance Tokens */
      unsettled_balance: number;
    }[];
  };
  /**
	 * Get channels
	 * 
	 * Requires `offchain:read` permission
	 * 
	 * `in_channel`, `in_payment`, `is_forward`, `out_channel`, `out_payment`,
`payment` are not supported on LND 0.11.1 and belo
	 */
  export const getChannels: AuthenticatedLNDMethod<
    GetChannelsArgs,
    GetChannelsResult
  >;

  export type GetClosedChannelsArgs = {
    /** Only Return Breach Close Channels */
    is_breach_close?: boolean;
    /** Only Return Cooperative Close Channels */
    is_cooperative_close?: boolean;
    /** Only Return Funding Canceled Channels */
    is_funding_cancel?: boolean;
    /** Only Return Local Force Close Channels */
    is_local_force_close?: boolean;
    /** Only Return Remote Force Close Channels */
    is_remote_force_close?: boolean;
  };
  export type GetClosedChannelsResult = {
    channels: {
      /** Closed Channel Capacity Tokens */
      capacity: number;
      /** Channel Balance Output Spent By Tx Id */
      close_balance_spent_by?: string;
      /** Channel Balance Close Tx Output Index */
      close_balance_vout?: number;
      close_payments: {
        /** Payment Is Outgoing */
        is_outgoing: boolean;
        /** Payment Is Claimed With Preimage */
        is_paid: boolean;
        /** Payment Resolution Is Pending */
        is_pending: boolean;
        /** Payment Timed Out And Went Back To Payer */
        is_refunded: boolean;
        /** Close Transaction Spent By Transaction Id Hex */
        spent_by?: string;
        /** Associated Tokens */
        tokens: number;
        /** Transaction Id Hex */
        transaction_id: string;
        /** Transaction Output Index */
        transaction_vout: number;
      }[];
      /** Channel Close Confirmation Height */
      close_confirm_height?: number;
      /** Closing Transaction Id Hex */
      close_transaction_id?: string;
      /** Channel Close Final Local Balance Tokens */
      final_local_balance: number;
      /** Closed Channel Timelocked Tokens */
      final_time_locked_balance: number;
      /** Closed Standard Format Channel Id */
      id?: string;
      /** Is Breach Close */
      is_breach_close: boolean;
      /** Is Cooperative Close */
      is_cooperative_close: boolean;
      /** Is Funding Cancelled Close */
      is_funding_cancel: boolean;
      /** Is Local Force Close */
      is_local_force_close: boolean;
      /** Channel Was Closed By Channel Peer */
      is_partner_closed?: boolean;
      /** Channel Was Initiated By Channel Peer */
      is_partner_initiated?: boolean;
      /** Is Remote Force Close */
      is_remote_force_close: boolean;
      /** Partner Public Key Hex */
      partner_public_key: string;
      /** Channel Funding Transaction Id Hex */
      transaction_id: string;
      /** Channel Funding Output Index */
      transaction_vout: number;
    }[];
  };
  /**
   * Get closed out channels
   *
   * Multiple close type flags are supported.
   *
   * Requires `offchain:read` permission
   */
  export const getClosedChannels: AuthenticatedLNDMethod<
    GetClosedChannelsArgs,
    GetClosedChannelsResult
  >;

  export type GetConnectedWatchTowersResult = {
    /** Maximum Updates Per Session */
    max_session_update_count: number;
    /** Sweep Tokens per Virtual Byte */
    sweep_tokens_per_vbyte: number;
    /** Total Backups Made Count */
    backups_count: number;
    /** Total Backup Failures Count */
    failed_backups_count: number;
    /** Finished Updated Sessions Count */
    finished_sessions_count: number;
    /** As Yet Unacknowledged Backup Requests Count */
    pending_backups_count: number;
    /** Total Backup Sessions Starts Count */
    sessions_count: number;
    towers: {
      /** Tower Can Be Used For New Sessions */
      is_active: boolean;
      /** Identity Public Key Hex */
      public_key: string;
      sessions: {
        /** Total Successful Backups Made Count */
        backups_count: number;
        /** Backups Limit */
        max_backups_count: number;
        /** Backups Pending Acknowledgement Count */
        pending_backups_count: number;
        /** Fee Rate in Tokens Per Virtual Byte */
        sweep_tokens_per_vbyte: number;
      }[];
      /** Tower Network Addresses (IP:Port) */
      sockets: string[];
    }[];
  };
  /**
   * Get a list of connected watchtowers and watchtower info
   * Requires LND built with `wtclientrpc` build tag
   * Requires `offchain:read` permission
   * Includes previously connected watchtowers
   */
  export const getConnectedWatchTowers: AuthenticatedLNDMethod<
    {},
    GetConnectedWatchTowersResult
  >;

  export type GetFeeRatesResult = {
    channels: {
      /** Base Flat Fee Tokens Rounded Up */
      base_fee: number;
      /** Base Flat Fee Millitokens */
      base_fee_mtokens: string;
      /** Standard Format Channel Id */
      id: string;
      /** Channel Funding Transaction Id Hex */
      transaction_id: string;
      /** Funding Outpoint Output Index */
      transaction_vout: number;
    }[];
  };
  /**
   * Get a rundown on fees for channels
   *
   * Requires `offchain:read` permission
   */
  export const getFeeRates: AuthenticatedLNDMethod<{}, GetFeeRatesResult>;

  export type GetForwardingConfidenceArgs = {
    /** From Public Key Hex */
    from: string;
    /** Millitokens To Send */
    mtokens: string;
    /** To Public Key Hex */
    to: string;
  };
  export type GetForwardingConfidenceResult = {
    /** Success Confidence Score Out Of One Million */
    confidence: number;
  };
  /**
   * Get the confidence in being able to send between a direct pair of nodes
   */
  export const getForwardingConfidence: AuthenticatedLNDMethod<
    GetForwardingConfidenceArgs,
    GetForwardingConfidenceResult
  >;

  export type GetForwardingReputationsResult = {
    nodes: {
      peers: {
        /** Failed to Forward Tokens */
        failed_tokens?: number;
        /** Forwarded Tokens */
        forwarded_tokens?: number;
        /** Failed Forward At ISO-8601 Date */
        last_failed_forward_at?: string;
        /** Forwarded At ISO 8601 Date */
        last_forward_at?: string;
        /** To Public Key Hex */
        to_public_key: string;
      }[];
      /** Node Identity Public Key Hex */
      public_key: string;
    }[];
  };
  /**
   * Get the set of forwarding reputations
   *
   * Requires `offchain:read` permission
   */
  export const getForwardingReputations: AuthenticatedLNDMethod<
    {},
    GetForwardingReputationsResult
  >;

  export type GetForwardsArgs = {
    /** Get Only Payments Forwarded At Or After ISO 8601 Date */
    after?: string;
    /** Get Only Payments Forwarded Before ISO 8601 Date */
    before?: string;
    /** Page Result Limit */
    limit?: number;
    /** Opaque Paging Token */
    token?: string;
  };
  export type GetForwardsResult = {
    forwards: {
      /** Forward Record Created At ISO 8601 Date */
      created_at: string;
      /** Fee Tokens Charged */
      fee: number;
      /** Approximated Fee Millitokens Charged */
      fee_mtokens: string;
      /** Incoming Standard Format Channel Id */
      incoming_channel: string;
      /** Forwarded Millitokens */
      mtokens: string;
      /** Outgoing Standard Format Channel Id */
      outgoing_channel: string;
      /** Forwarded Tokens */
      tokens: number;
    }[];
    /** Continue With Opaque Paging Token */
    next?: string;
  };
  /**
   * Get forwarded payments, from oldest to newest
   *
   * When using an `after` date a `before` date is required.
   *
   * If a next token is returned, pass it to get additional page of results.
   *
   * Requires `offchain:read` permission
   */
  export const getForwards: AuthenticatedLNDMethod<
    GetForwardsArgs,
    GetForwardsResult
  >;

  export type GetHeightResult = {
    /** Best Chain Hash Hex */
    current_block_hash: string;
    /** Best Chain Height */
    current_block_height: number;
  };
  /**
   * Lookup the current best block height
   * LND with `chainrpc` build tag and `onchain:read` permission is suggested
   * Otherwise, `info:read` permission is require
   */
  export const getHeight: AuthenticatedLNDMethod<{}, GetHeightResult>;

  export type GetIdentityResult = {
    /** Node Identity Public Key Hex */
    public_key: string;
  };
  /**
   * Lookup the identity key for a node
   *
   * LND with `walletrpc` build tag and `address:read` permission is suggested
   *
   * Otherwise, `info:read` permission is require
   */
  export const getIdentity: AuthenticatedLNDMethod<{}, GetIdentityResult>;

  export type GetInvoiceArgs = {
    /** Payment Hash Id Hex */
    id: string;
  };
  export type GetInvoiceResult = {
    /** Fallback Chain Address */
    chain_address?: string;
    /** CLTV Delta */
    cltv_delta: number;
    /** Settled at ISO 8601 Date */
    confirmed_at?: string;
    /** ISO 8601 Date */
    created_at: string;
    /** Description */
    description: string;
    /** Description Hash Hex */
    description_hash?: string;
    /** ISO 8601 Date */
    expires_at: string;
    features: {
      /** BOLT 09 Feature Bit */
      bit: number;
      /** Feature is Known */
      is_known: boolean;
      /** Feature Support is Required To Pay */
      is_required: boolean;
      /** Feature Type */
      type: string;
    }[];
    /** Payment Hash */
    id: string;
    /** Invoice is Canceled */
    is_canceled?: boolean;
    /** Invoice is Confirmed */
    is_confirmed: boolean;
    /** HTLC is Held */
    is_held?: boolean;
    /** Invoice is Private */
    is_private: boolean;
    /** Invoice is Push Payment */
    is_push?: boolean;
    payments: {
      /** Payment Settled At ISO 8601 Date */
      confirmed_at?: string;
      /** Payment Held Since ISO 860 Date */
      created_at: string;
      /** Payment Held Since Block Height */
      created_height: number;
      /** Incoming Payment Through Channel Id */
      in_channel: string;
      /** Payment is Canceled */
      is_canceled: boolean;
      /** Payment is Confirmed */
      is_confirmed: boolean;
      /** Payment is Held */
      is_held: boolean;
      messages: {
        /** Message Type number */
        type: string;
        /** Raw Value Hex */
        value: string;
      }[];
      /** Incoming Payment Millitokens */
      mtokens: string;
      /** Pending Payment Channel HTLC Index */
      pending_index?: number;
      /** Payment Tokens */
      tokens: number;
    }[];
    /** Received Tokens */
    received: number;
    /** Received Millitokens */
    received_mtokens: string;
    /** Bolt 11 Invoice */
    request?: string;
    /** Secret Preimage Hex */
    secret: string;
    /** Tokens */
    tokens: number;
  };
  /**
	 * Lookup a channel invoice.
	 * 
	 * The received value and the invoiced value may differ as invoices may be
over-paid.
	 *
	 * Requires `invoices:read` permission
	 */
  export const getInvoice: AuthenticatedLNDMethod<
    GetInvoiceArgs,
    GetInvoiceResult
  >;

  export type GetInvoicesArgs = {
    /** Page Result Limit */
    limit?: number;
    /** Opaque Paging Token */
    token?: string;
  };
  export type GetInvoicesResult = {
    invoices: {
      /** Fallback Chain Address */
      chain_address?: string;
      /** Settled at ISO 8601 Date */
      confirmed_at?: string;
      /** ISO 8601 Date */
      created_at: string;
      /** Description */
      description: string;
      /** Description Hash Hex */
      description_hash?: string;
      /** ISO 8601 Date */
      expires_at: string;
      features: {
        /** BOLT 09 Feature Bit */
        bit: number;
        /** Feature is Known */
        is_known: boolean;
        /** Feature Support is Required To Pay */
        is_required: boolean;
        /** Feature Type */
        type: string;
      }[];
      /** Payment Hash */
      id: string;
      /** Invoice is Canceled */
      is_canceled?: boolean;
      /** Invoice is Confirmed */
      is_confirmed: boolean;
      /** HTLC is Held */
      is_held?: boolean;
      /** Invoice is Private */
      is_private: boolean;
      /** Invoice is Push Payment */
      is_push?: boolean;
      payments: {
        /** Payment Settled At ISO 8601 Date */
        confirmed_at?: string;
        /** Payment Held Since ISO 860 Date */
        created_at: string;
        /** Payment Held Since Block Height */
        created_height: number;
        /** Incoming Payment Through Channel Id */
        in_channel: string;
        /** Payment is Canceled */
        is_canceled: boolean;
        /** Payment is Confirmed */
        is_confirmed: boolean;
        /** Payment is Held */
        is_held: boolean;
        messages: {
          /** Message Type number */
          type: string;
          /** Raw Value Hex */
          value: string;
        }[];
        /** Incoming Payment Millitokens */
        mtokens: string;
        /** Pending Payment Channel HTLC Index */
        pending_index?: number;
        /** Payment Tokens */
        tokens: number;
        /** Total Millitokens */
        total_mtokens?: string;
      }[];
      /** Received Tokens */
      received: number;
      /** Received Millitokens */
      received_mtokens: string;
      /** Bolt 11 Invoice */
      request?: string;
      /** Secret Preimage Hex */
      secret: string;
      /** Tokens */
      tokens: number;
    }[];
    /** Next Opaque Paging Token */
    next?: string;
  };
  /**
   * Get all created invoices.
   *
   * If a next token is returned, pass it to get another page of invoices.
   *
   * Requires `invoices:read` permission
   */
  export const getInvoices: AuthenticatedLNDMethod<
    GetInvoicesArgs,
    GetInvoicesResult
  >;

  export type GetMethodsResult = {
    methods: {
      /** Method Endpoint Path */
      endpoint: string;
      /** Entity:Action */
      permissions: string[];
    }[];
  };
  /**
   * Get the list of all methods and their associated requisite permissions
   *
   * Note: this method is not supported in LND versions 0.11.1 and below
   *
   * Requires `info:read` permission
   */
  export const getMethods: AuthenticatedLNDMethod<{}, GetMethodsResult>;

  export type GetNetworkCentralityResult = {
    nodes: {
      /** Betweenness Centrality */
      betweenness: number;
      /** Normalized Betweenness Centrality */
      betweenness_normalized: number;
      /** Node Public Key Hex */
      public_key: string;
    }[];
  };
  /**
   * Get the graph centrality scores of the nodes on the network
   * Scores are from 0 to 1,000,000.
   * Requires `info:read` permissio
   */
  export const getNetworkCentrality: AuthenticatedLNDMethod<
    {},
    GetNetworkCentralityResult
  >;

  export type GetNetworkGraphResult = {
    channels: {
      /** Channel Capacity Tokens */
      capacity: number;
      /** Standard Format Channel Id */
      id: string;
      policies: {
        /** Bae Fee Millitokens */
        base_fee_mtokens?: string;
        /** CLTV Height Delta */
        cltv_delta?: number;
        /** Fee Rate In Millitokens Per Million */
        fee_rate?: number;
        /** Edge is Disabled */
        is_disabled?: boolean;
        /** Maximum HTLC Millitokens */
        max_htlc_mtokens?: string;
        /** Minimum HTLC Millitokens */
        min_htlc_mtokens?: string;
        /** Public Key */
        public_key: string;
        /** Last Update Epoch ISO 8601 Date */
        updated_at?: string;
      }[];
      /** Funding Transaction Id */
      transaction_id: string;
      /** Funding Transaction Output Index */
      transaction_vout: number;
      /** Last Update Epoch ISO 8601 Date */
      updated_at?: string;
    }[];
    nodes: {
      /** Name */
      alias: string;
      /** Hex Encoded Color */
      color: string;
      features: {
        /** BOLT 09 Feature Bit */
        bit: number;
        /** Feature is Known */
        is_known: boolean;
        /** Feature Support is Required */
        is_required: boolean;
        /** Feature Type */
        type: string;
      }[];
      /** Node Public Key */
      public_key: string;
      /** Network Addresses and Ports */
      sockets: string[];
      /** Last Updated ISO 8601 Date */
      updated_at: string;
    }[];
  };
  /**
   * Get the network graph
   *
   * Requires `info:read` permission
   */
  export const getNetworkGraph: AuthenticatedLNDMethod<
    {},
    GetNetworkGraphResult
  >;

  export type GetNetworkInfoResult = {
    /** Tokens */
    average_channel_size: number;
    /** Channels Count */
    channel_count: number;
    /** Tokens */
    max_channel_size: number;
    /** Median Channel Tokens */
    median_channel_size: number;
    /** Tokens */
    min_channel_size: number;
    /** Node Count */
    node_count: number;
    /** Channel Edge Count */
    not_recently_updated_policy_count: number;
    /** Total Capacity */
    total_capacity: number;
  };
  /**
   * Get network info
   *
   * Requires `info:read` permission
   */
  export const getNetworkInfo: AuthenticatedLNDMethod<{}, GetNetworkInfoResult>;

  export type GetNodeArgs = {
    /** Omit Channels from Node */
    is_omitting_channels?: boolean;
    /** Node Public Key Hex */
    public_key: string;
  };
  export type GetNodeResult = {
    /** Node Alias */
    alias: string;
    /** Node Total Capacity Tokens */
    capacity: number;
    /** Known Node Channels */
    channel_count: number;
    channels?: {
      /** Maximum Tokens */
      capacity: number;
      /** Standard Format Channel Id */
      id: string;
      policies: {
        /** Base Fee Millitokens */
        base_fee_mtokens?: string;
        /** Locktime Delta */
        cltv_delta?: number;
        /** Fees Charged Per Million Millitokens */
        fee_rate?: number;
        /** Channel Is Disabled */
        is_disabled?: boolean;
        /** Maximum HTLC Millitokens Value */
        max_htlc_mtokens?: string;
        /** Minimum HTLC Millitokens Value */
        min_htlc_mtokens?: string;
        /** Node Public Key */
        public_key: string;
        /** Policy Last Updated At ISO 8601 Date */
        updated_at?: string;
      }[];
      /** Transaction Id Hex */
      transaction_id: string;
      /** Transaction Output Index */
      transaction_vout: number;
      /** Channel Last Updated At ISO 8601 Date */
      updated_at?: string;
    }[];
    /** RGB Hex Color */
    color: string;
    features: {
      /** BOLT 09 Feature Bit */
      bit: number;
      /** Feature is Known */
      is_known: boolean;
      /** Feature Support is Required */
      is_required: boolean;
      /** Feature Type */
      type: string;
    }[];
    sockets: {
      /** Host and Port */
      socket: string;
      /** Socket Type */
      type: string;
    }[];
    /** Last Known Update ISO 8601 Date */
    updated_at?: string;
  };
  /**
   * Get information about a node
   * Requires `info:read` permission
   */
  export const getNode: AuthenticatedLNDMethod<GetNodeArgs, GetNodeResult>;

  export type GetPaymentArgs = {
    /** Payment Preimage Hash Hex */
    id: string;
  };
  export type GetPaymentResult = {
    failed?: {
      /** Failed Due To Lack of Balance */
      is_insufficient_balance: boolean;
      /** Failed Due to Payment Rejected At Destination */
      is_invalid_payment: boolean;
      /** Failed Due to Pathfinding Timeout */
      is_pathfinding_timeout: boolean;
      /** Failed Due to Absence of Path Through Graph */
      is_route_not_found: boolean;
    };
    /** Payment Is Settled */
    is_confirmed?: boolean;
    /** Payment Is Failed */
    is_failed?: boolean;
    /** Payment Is Pending */
    is_pending?: boolean;
    payment?: {
      /** Total Fee Millitokens To Pay */
      fee_mtokens: string;
      hops: {
        /** Standard Format Channel Id */
        channel: string;
        /** Channel Capacity Tokens */
        channel_capacity: number;
        /** Routing Fee Tokens */
        fee: number;
        /** Fee Millitokens */
        fee_mtokens: string;
        /** Forwarded Tokens */
        forward: number;
        /** Forward Millitokens */
        forward_mtokens: string;
        /** Public Key Hex */
        public_key: string;
        /** Timeout Block Height */
        timeout: number;
      }[];
      /** Payment Hash Hex */
      id: string;
      /** Total Millitokens Paid */
      mtokens: string;
      /** Payment Forwarding Fee Rounded Up Tokens */
      safe_fee: number;
      /** Payment Tokens Rounded Up */
      safe_tokens: number;
      /** Payment Preimage Hex */
      secret: string;
      /** Expiration Block Height */
      timeout: number;
      /** Total Tokens Paid */
      tokens: number;
    };
  };
  /**
   * Get the status of a past payment
   *
   * Requires `offchain:read` permissio
   */
  export const getPayment: AuthenticatedLNDMethod<
    GetPaymentArgs,
    GetPaymentResult
  >;

  export type GetPaymentsArgs = {
    /** Page Result Limit */
    limit?: number;
    /** Opaque Paging Token */
    token?: string;
  };
  export type GetPaymentsResult = {
    payments: {
      attempts: {
        failure?: {
          /** Error Type Code */
          code: number;
          details?: {
            /** Standard Format Channel Id */
            channel?: string;
            /** Error Associated Block Height */
            height?: number;
            /** Failed Hop Index */
            index?: number;
            /** Error Millitokens */
            mtokens?: string;
            policy?: {
              /** Base Fee Millitokens */
              base_fee_mtokens: string;
              /** Locktime Delta */
              cltv_delta: number;
              /** Fees Charged Per Million Tokens */
              fee_rate: number;
              /** Channel is Disabled */
              is_disabled?: boolean;
              /** Maximum HLTC Millitokens Value */
              max_htlc_mtokens: string;
              /** Minimum HTLC Millitokens Value */
              min_htlc_mtokens: string;
              /** Updated At ISO 8601 Date */
              updated_at: string;
            };
            /** Error CLTV Timeout Height */
            timeout_height?: number;
            update?: {
              /** Chain Id Hex */
              chain: string;
              /** Channel Flags */
              channel_flags: number;
              /** Extra Opaque Data Hex */
              extra_opaque_data: string;
              /** Message Flags */
              message_flags: number;
              /** Channel Update Signature Hex */
              signature: string;
            };
          };
          /** Error Message */
          message: string;
        };
        /** Payment Attempt Succeeded */
        is_confirmed: boolean;
        /** Payment Attempt Failed */
        is_failed: boolean;
        /** Payment Attempt is Waiting For Resolution */
        is_pending: boolean;
        route: {
          /** Route Fee Tokens */
          fee: number;
          /** Route Fee Millitokens */
          fee_mtokens: string;
          hops: {
            /** Standard Format Channel Id */
            channel: string;
            /** Channel Capacity Tokens */
            channel_capacity: number;
            /** Fee */
            fee: number;
            /** Fee Millitokens */
            fee_mtokens: string;
            /** Forward Tokens */
            forward: number;
            /** Forward Millitokens */
            forward_mtokens: string;
            /** Forward Edge Public Key Hex */
            public_key?: string;
            /** Timeout Block Height */
            timeout?: number;
          }[];
          /** Total Fee-Inclusive Millitokens */
          mtokens: string;
          /** Payment Identifier Hex */
          payment?: string;
          /** Timeout Block Height */
          timeout: number;
          /** Total Fee-Inclusive Tokens */
          tokens: number;
          /** Total Millitokens */
          total_mtokens?: string;
        };
      }[];
      /** Payment at ISO-8601 Date */
      created_at: string;
      /** Destination Node Public Key Hex */
      destination: string;
      /** Paid Routing Fee Rounded Down Tokens */
      fee: number;
      /** Paid Routing Fee in Millitokens */
      fee_mtokens: string;
      /** First Route Hop Public Key Hex */
      hops: string[];
      /** Payment Preimage Hash */
      id: string;
      /** Payment Add Index */
      index?: number;
      /** Payment is Confirmed */
      is_confirmed: boolean;
      /** Transaction Is Outgoing */
      is_outgoing: boolean;
      /** Millitokens Sent to Destination */
      mtokens: string;
      /** BOLT 11 Payment Request */
      request?: string;
      /** Payment Forwarding Fee Rounded Up Tokens */
      safe_fee: number;
      /** Payment Tokens Rounded Up */
      safe_tokens: number;
      /** Payment Preimage Hex */
      secret: string;
      /** Rounded Down Tokens Sent to Destination */
      tokens: number;
    }[];
    /** Next Opaque Paging Token */
    next?: string;
  };
  /**
   * Get payments made through channels.
   *
   * Requires `offchain:read` permission
   */
  export const getPayments: AuthenticatedLNDMethod<
    GetPaymentsArgs,
    GetPaymentsResult
  >;

  export type GetPeersResult = {
    peers: {
      /** Bytes Received */
      bytes_received: number;
      /** Bytes Sent */
      bytes_sent: number;
      features: {
        /** BOLT 09 Feature Bit */
        bit: number;
        /** Feature is Known */
        is_known: boolean;
        /** Feature Support is Required */
        is_required: boolean;
        /** Feature Type */
        type: string;
      }[];
      /** Is Inbound Peer */
      is_inbound: boolean;
      /** Is Syncing Graph Data */
      is_sync_peer?: boolean;
      /** Peer Last Reconnected At ISO 8601 Date */
      last_reconnected?: string;
      /** Ping Latency Milliseconds */
      ping_time: number;
      /** Node Identity Public Key */
      public_key: string;
      /** Count of Reconnections Over Time */
      reconnection_rate?: number;
      /** Network Address And Port */
      socket: string;
      /** Amount Received Tokens */
      tokens_received: number;
      /** Amount Sent Tokens */
      tokens_sent: number;
    }[];
  };
  /**
   * Get connected peers.
   *
   * Requires `peers:read` permission
   *
   * LND 0.11.1 and below do not return `last_reconnected` or `reconnection_rate
   */
  export const getPeers: AuthenticatedLNDMethod<{}, GetPeersResult>;

  export type GetPendingChainBalanceResult = {
    /** Pending Chain Balance Tokens */
    pending_chain_balance: number;
  };
  /**
   * Get pending chain balance in simple unconfirmed outputs.
   *
   * Pending channels limbo balance is not included
   *
   * Requires `onchain:read` permission
   */
  export const getPendingChainBalance: AuthenticatedLNDMethod<
    {},
    GetPendingChainBalanceResult
  >;

  export type GetPendingChannelsResult = {
    pending_channels: {
      /** Channel Closing Transaction Id */
      close_transaction_id?: string;
      /** Channel Is Active */
      is_active: boolean;
      /** Channel Is Closing */
      is_closing: boolean;
      /** Channel Is Opening */
      is_opening: boolean;
      /** Channel Partner Initiated Channel */
      is_partner_initiated?: boolean;
      /** Channel Local Tokens Balance */
      local_balance: number;
      /** Channel Local Reserved Tokens */
      local_reserve: number;
      /** Channel Peer Public Key */
      partner_public_key: string;
      /** Tokens Pending Recovery */
      pending_balance?: number;
      pending_payments?: {
        /** Payment Is Incoming */
        is_incoming: boolean;
        /** Payment Timelocked Until Height */
        timelock_height: number;
        /** Payment Tokens */
        tokens: number;
        /** Payment Transaction Id */
        transaction_id: string;
        /** Payment Transaction Vout */
        transaction_vout: number;
      }[];
      /** Tokens Received */
      received: number;
      /** Tokens Recovered From Close */
      recovered_tokens?: number;
      /** Remote Tokens Balance */
      remote_balance: number;
      /** Channel Remote Reserved Tokens */
      remote_reserve: number;
      /** Send Tokens */
      sent: number;
      /** Pending Tokens Block Height Timelock */
      timelock_expiration?: number;
      /** Funding Transaction Fee Tokens */
      transaction_fee?: number;
      /** Channel Funding Transaction Id */
      transaction_id: string;
      /** Channel Funding Transaction Vout */
      transaction_vout: number;
      /** Funding Transaction Weight */
      transaction_weight?: number;
    }[];
  };
  /**
   * Get pending channels.
	 * 
	 * Both `is_closing` and `is_opening` are returned as part of a channel because a
channel may be opening, closing, or active.
	 * 
	 * Requires `offchain:read` permission
   */
  export const getPendingChannels: AuthenticatedLNDMethod<
    {},
    GetPendingChannelsResult
  >;

  export type GetPublicKeyArgs = {
    /** Key Family */
    family: number;
    /** Key Index */
    index?: number;
  };
  export type GetPublicKeyResult = {
    /** Key Index */
    index: number;
    /** Public Key Hex */
    public_key: string;
  };
  /**
   * Get a public key in the seed
   *
   * Omit a key index to cycle to the "next" key in the family
   *
   * Requires LND compiled with `walletrpc` build tag
   *
   * Requires `address:read` permission
   */
  export const getPublicKey: AuthenticatedLNDMethod<
    GetPublicKeyArgs,
    GetPublicKeyResult
  >;

  export type GetRouteConfidenceArgs = {
    /** Starting Hex Serialized Public Key */
    from?: string;
    hops: {
      /** Forward Millitokens */
      forward_mtokens: string;
      /** Forward Edge Public Key Hex */
      public_key: string;
    }[];
  };
  export type GetRouteConfidenceResult = {
    /** Confidence Score Out Of One Million */
    confidence: number;
  };
  /**
   * Get routing confidence of successfully routing a payment to a destination
   *
   * If `from` is not set, self is default
   *
   * Requires `offchain:read` permission
   */
  export const getRouteConfidence: AuthenticatedLNDMethod<
    GetRouteConfidenceArgs,
    GetRouteConfidenceResult
  >;

  export type GetRouteThroughHopsArgs = {
    /** Final CLTV Delta */
    cltv_delta?: number;
    /** Millitokens to Send */
    mtokens?: string;
    /** Outgoing Channel Id */
    outgoing_channel?: string;
    messages?: {
      /** Message Type number */
      type: string;
      /** Message Raw Value Hex Encoded */
      value: string;
    }[];
    /** Payment Identifier Hex */
    payment?: string;
    /** Public Key Hex Strings */
    public_keys: string[];
    /** Tokens to Send */
    tokens?: number;
    /** Payment Total Millitokens */
    total_mtokens?: string;
  };
  export type GetRouteThroughHopsResult = {
    route: {
      /** Route Fee Tokens */
      fee: number;
      /** Route Fee Millitokens */
      fee_mtokens: string;
      hops: {
        /** Standard Format Channel Id */
        channel: string;
        /** Channel Capacity Tokens */
        channel_capacity: number;
        /** Fee */
        fee: number;
        /** Fee Millitokens */
        fee_mtokens: string;
        /** Forward Tokens */
        forward: number;
        /** Forward Millitokens */
        forward_mtokens: string;
        /** Forward Edge Public Key Hex */
        public_key: string;
        /** Timeout Block Height */
        timeout: number;
      }[];
      messages?: {
        /** Message Type number */
        type: string;
        /** Message Raw Value Hex Encoded */
        value: string;
      }[];
      /** Total Fee-Inclusive Millitokens */
      mtokens: string;
      /** Payment Identifier Hex */
      payment?: string;
      /** Payment Forwarding Fee Rounded Up Tokens */
      safe_fee: number;
      /** Payment Tokens Rounded Up */
      safe_tokens: number;
      /** Route Timeout Height */
      timeout: number;
      /** Total Fee-Inclusive Tokens */
      tokens: number;
      /** Payment Total Millitokens */
      total_mtokens?: string;
    };
  };
  /**
   * Get an outbound route that goes through specific hops
   *
   * Requires `offchain:read` permission
   */
  export const getRouteThroughHops: AuthenticatedLNDMethod<
    GetRouteThroughHopsArgs,
    GetRouteThroughHopsResult
  >;

  export type GetRouteToDestinationArgs = {
    /** Final CLTV Delta */
    cltv_delta?: number;
    /** Final Send Destination Hex Encoded Public Key */
    destination: string;
    features?: {
      /** Feature Bit */
      bit: number;
    }[];
    ignore?: {
      /** Channel Id */
      channel?: string;
      /** Public Key Hex */
      from_public_key: string;
      /** To Public Key Hex */
      to_public_key?: string;
    }[];
    /** Incoming Peer Public Key Hex */
    incoming_peer?: string;
    /** Ignore Past Failures */
    is_ignoring_past_failures?: boolean;
    /** Maximum Fee Tokens */
    max_fee?: number;
    /** Maximum Fee Millitokens */
    max_fee_mtokens?: string;
    /** Max CLTV Timeout */
    max_timeout_height?: number;
    messages?: {
      /** Message To Final Destination Type number */
      type: string;
      /** Message To Final Destination Raw Value Hex Encoded */
      value: string;
    }[];
    /** Tokens to Send */
    mtokens?: string;
    /** Outgoing Channel Id */
    outgoing_channel?: string;
    /** Payment Identifier Hex */
    payment?: string;
    routes?: [
      {
        /** Base Routing Fee In Millitokens */
        base_fee_mtokens?: string;
        /** Standard Format Channel Id */
        channel?: string;
        /** Channel Capacity Tokens */
        channel_capacity?: number;
        /** CLTV Delta Blocks */
        cltv_delta?: number;
        /** Fee Rate In Millitokens Per Million */
        fee_rate?: number;
        /** Forward Edge Public Key Hex */
        public_key: string;
      }[]
    ];
    /** Starting Node Public Key Hex */
    start?: string;
    /** Tokens */
    tokens?: number;
    /** Total Millitokens of Shards */
    total_mtokens?: string;
  };
  export type GetRouteToDestinationResult = {
    route?: {
      /** Route Confidence Score Out Of One Million */
      confidence?: number;
      /** Route Fee Tokens */
      fee: number;
      /** Route Fee Millitokens */
      fee_mtokens: string;
      hops: {
        /** Standard Format Channel Id */
        channel: string;
        /** Channel Capacity Tokens */
        channel_capacity: number;
        /** Fee */
        fee: number;
        /** Fee Millitokens */
        fee_mtokens: string;
        /** Forward Tokens */
        forward: number;
        /** Forward Millitokens */
        forward_mtokens: string;
        /** Forward Edge Public Key Hex */
        public_key: string;
        /** Timeout Block Height */
        timeout: number;
      }[];
      messages?: {
        /** Message Type number */
        type: string;
        /** Message Raw Value Hex Encoded */
        value: string;
      }[];
      /** Total Fee-Inclusive Millitokens */
      mtokens: string;
      /** Payment Forwarding Fee Rounded Up Tokens */
      safe_fee: number;
      /** Payment Tokens Rounded Up */
      safe_tokens: number;
      /** Route Timeout Height */
      timeout: number;
      /** Total Fee-Inclusive Tokens */
      tokens: number;
    };
  };
  /**
   * Get a route to a destination.
   *
   * Call this iteratively after failed route attempts to get new routes
   *
   * Requires `info:read` permission
   */
  export const getRouteToDestination: AuthenticatedLNDMethod<
    GetRouteToDestinationArgs,
    GetRouteToDestinationResult
  >;

  export type GetSweepTransactionsResult = {
    transactions: {
      /** Block Hash */
      block_id?: string;
      /** Confirmation Count */
      confirmation_count?: number;
      /** Confirmation Block Height */
      confirmation_height?: number;
      /** Created ISO 8601 Date */
      created_at: string;
      /** Fees Paid Tokens */
      fee?: number;
      /** Transaction Id */
      id: string;
      /** Is Confirmed */
      is_confirmed: boolean;
      /** Transaction Outbound */
      is_outgoing: boolean;
      /** Addresses */
      output_addresses: string[];
      spends: {
        /** Output Tokens */
        tokens?: number;
        /** Spend Transaction Id Hex */
        transaction_id: string;
        /** Spend Transaction Output Index */
        transaction_vout: number;
      }[];
      /** Tokens Including Fee */
      tokens: number;
      /** Raw Transaction Hex */
      transaction?: string;
    }[];
  };
  /**
   * Get self-transfer spend transactions related to channel closes
   *
   * Requires `onchain:read` permissio
   */
  export const getSweepTransactions: AuthenticatedLNDMethod<
    {},
    GetSweepTransactionsResult
  >;

  export type GetTowerServerInfoResult = {
    tower?: {
      /** Watchtower Server Public Key Hex */
      public_key: string;
      /** Sockets */
      sockets: string[];
      /** Watchtower External URIs */
      uris: string[];
    };
  };
  /**
   * Get watchtower server info.
   * This method requires LND built with `watchtowerrpc` build tag
   * Requires `info:read` permission
   */
  export const getTowerServerInfo: AuthenticatedLNDMethod<
    {},
    GetTowerServerInfoResult
  >;

  export type GetUTXOsArgs = {
    /** Maximum Confirmations */
    max_confirmations?: number;
    /** Minimum Confirmations */
    min_confirmations?: number;
  };
  export type GetUTXOsResult = {
    utxos: {
      /** Chain Address */
      address: string;
      /** Chain Address Format */
      address_format: string;
      /** Confirmation Count */
      confirmation_count: number;
      /** Output Script Hex */
      output_script: string;
      /** Unspent Tokens */
      tokens: number;
      /** Transaction Id Hex */
      transaction_id: string;
      /** Transaction Output Index */
      transaction_vout: number;
    }[];
  };
  /**
   * Get unspent transaction outputs
   *
   * Requires `onchain:read` permission
   */
  export const getUtxos: AuthenticatedLNDMethod<GetUTXOsArgs, GetUTXOsResult>;

  export type GetWalletInfoResult = {
    /** Active Channels Count */
    active_channels_count: number;
    /** Node Alias */
    alias: string;
    /** Chain Id Hex */
    chains: string[];
    /** Node Color */
    color: string;
    /** Best Chain Hash Hex */
    current_block_hash: string;
    /** Best Chain Height */
    current_block_height: number;
    features: {
      /** BOLT 09 Feature Bit */
      bit: number;
      /** Feature is Known */
      is_known: boolean;
      /** Feature Support is Required */
      is_required: boolean;
      /** Feature Type */
      type: string;
    }[];
    /** Is Synced To Chain */
    is_synced_to_chain: boolean;
    /** Latest Known Block At Date */
    latest_block_at: string;
    /** Peer Count */
    peers_count: number;
    /** Pending Channels Count */
    pending_channels_count: number;
    /** Public Key */
    public_key: string;
  };
  /**
   * Get overall wallet info.
   *
   * Requires `info:read` permission
   */
  export const getWalletInfo: AuthenticatedLNDMethod<{}, GetWalletInfoResult>;

  export type GetWalletVersionResult = {
    /** Build Tag */
    build_tags: string[];
    /** Commit SHA1 160 Bit Hash Hex */
    commit_hash: string;
    /** Is Autopilot RPC Enabled */
    is_autopilotrpc_enabled: boolean;
    /** Is Chain RPC Enabled */
    is_chainrpc_enabled: boolean;
    /** Is Invoices RPC Enabled */
    is_invoicesrpc_enabled: boolean;
    /** Is Sign RPC Enabled */
    is_signrpc_enabled: boolean;
    /** Is Wallet RPC Enabled */
    is_walletrpc_enabled: boolean;
    /** Is Watchtower Server RPC Enabled */
    is_watchtowerrpc_enabled: boolean;
    /** Is Watchtower Client RPC Enabled */
    is_wtclientrpc_enabled: boolean;
    /** Recognized LND Version */
    version?: string;
  };
  /**
   * Get wallet version
   *
   * Tags are self-reported by LND and are not guaranteed to be accurate
   *
   * Requires `info:read` permissio
   */
  export const getWalletVersion: AuthenticatedLNDMethod<
    {},
    GetWalletVersionResult
  >;

  export type GrantAccessArgs = {
    /** Macaroon Id Positive Numeric */
    id?: string;
    /** Can Add or Remove Peers */
    is_ok_to_adjust_peers?: boolean;
    /** Can Make New Addresses */
    is_ok_to_create_chain_addresses?: boolean;
    /** Can Create Lightning Invoices */
    is_ok_to_create_invoices?: boolean;
    /** Can Create Macaroons */
    is_ok_to_create_macaroons?: boolean;
    /** Can Derive Public Keys */
    is_ok_to_derive_keys?: boolean;
    /** Can List Access Ids */
    is_ok_to_get_access_ids?: boolean;
    /** Can See Chain Transactions */
    is_ok_to_get_chain_transactions?: boolean;
    /** Can See Invoices */
    is_ok_to_get_invoices?: boolean;
    /** Can General Graph and Wallet Information */
    is_ok_to_get_wallet_info?: boolean;
    /** Can Get Historical Lightning Transactions */
    is_ok_to_get_payments?: boolean;
    /** Can Get Node Peers Information */
    is_ok_to_get_peers?: boolean;
    /** Can Send Funds or Edit Lightning Payments */
    is_ok_to_pay?: boolean;
    /** Can Revoke Access Ids */
    is_ok_to_revoke_access_ids?: boolean;
    /** Can Send Coins On Chain */
    is_ok_to_send_to_chain_addresses?: boolean;
    /** Can Sign Bytes From Node Keys */
    is_ok_to_sign_bytes?: boolean;
    /** Can Sign Messages From Node Key */
    is_ok_to_sign_messages?: boolean;
    /** Can Terminate Node or Change Operation Mode */
    is_ok_to_stop_daemon?: boolean;
    /** Can Verify Signatures of Bytes */
    is_ok_to_verify_bytes_signatures?: boolean;
    /** Can Verify Messages From Node Keys */
    is_ok_to_verify_messages?: boolean;
    /** Entity:Action */
    permissions?: string[];
  };
  export type GrantAccessResult = {
    /** Base64 Encoded Macaroon */
    macaroon: string;
    /** Entity:Action */
    permissions: string[];
  };
  /**
	 * Give access to the node by making a macaroon access credential
	 * 
	 * Specify `id` to allow for revoking future access
	 *
	 * Requires `macaroon:generate` permission
	 *
	 * Note: access once given cannot be revoked. Access is defined at the LND level
and version differences in LND can result in expanded access.
	 *
	 * Note: `id` is not supported in LND versions 0.11.0 and below
	 */
  export const grantAccess: AuthenticatedLNDMethod<
    GrantAccessArgs,
    GrantAccessResult
  >;

  export type GRPCProxyServerArgs = {
    /** Bind to Address */
    bind?: string;
    /** LND Cert Base64 */
    cert?: string;
    /** Log Function */
    log: (
      error: LNServiceError<Error> | null | undefined,
      output: string
    ) => void;
    /** Router Path */
    path: string;
    /** Listen Port */
    port: number;
    /** LND Socket */
    socket: string;
    /** Log Write Stream */
    stream: stream.Writable;
  };
  export type GRPCProxyServerResult = {
    /** Express Application */
    app: express.Express;
    /** Web Server */
    server: http.Server;
    /** WebSocket Server */
    wss: ws.Server;
  };
  /**
   * Get a gRPC proxy server
   */
  export const grpcProxyServer: (
    args: GRPCProxyServerArgs
  ) => GRPCProxyServerResult;

  export type IsDestinationPayableArgs = {
    /** Final CLTV Delta */
    cltv_delta?: number;
    /** Pay to Node with Public Key Hex */
    destination: string;
    /** Pay Through Specific Final Hop Public Key Hex */
    incoming_peer?: string;
    /** Maximum Fee Tokens To Pay */
    max_fee?: number;
    /** Maximum Expiration CLTV Timeout Height */
    max_timeout_height?: number;
    /** Pay Out of Outgoing Standard Format Channel Id */
    outgoing_channel?: string;
    /** Time to Spend Finding a Route Milliseconds */
    pathfinding_timeout?: number;
    routes?: {
      /** Base Routing Fee In Millitokens */
      base_fee_mtokens?: string;
      /** Standard Format Channel Id */
      channel?: string;
      /** CLTV Blocks Delta */
      cltv_delta?: number;
      /** Fee Rate In Millitokens Per Million */
      fee_rate?: number;
      /** Forward Edge Public Key Hex */
      public_key: string;
    }[][];
    /** Paying Tokens */
    tokens?: number;
  };
  export type IsDestinationPayableResult = {
    /** Payment Is Successfully Tested Within Constraints */
    is_payable: boolean;
  };
  /**
   * Determine if a payment destination is actually payable by probing it
   *
   * Requires `offchain:write` permission
   */
  export const isDestinationPayable: AuthenticatedLNDMethod<
    IsDestinationPayableArgs,
    IsDestinationPayableResult
  >;

  export type LockUTXOArgs = {
    /** Lock Identifier Hex */
    id?: string;
    /** Unspent Transaction Id Hex */
    transaction_id: string;
    /** Unspent Transaction Output Index */
    transaction_vout: number;
  };
  export type LockUTXOResult = {
    /** Lock Expires At ISO 8601 Date */
    expires_at: string;
    /** Locking Id Hex */
    id: string;
  };
  /**
   * Lock UTXO
   *
   * Requires `onchain:write` permission
   *
   * Requires LND built with `walletrpc` build tag
   */
  export const lockUtxo: AuthenticatedLNDMethod<LockUTXOArgs, LockUTXOResult>;

  export type OpenChannelArgs = {
    /** Chain Fee Tokens Per VByte */
    chain_fee_tokens_per_vbyte?: number;
    /** Restrict Cooperative Close To Address */
    cooperative_close_address?: string;
    /** Tokens to Gift To Partner */
    give_tokens?: number;
    /** Channel is Private */
    is_private?: boolean;
    /** Local Tokens */
    local_tokens: number;
    /** Spend UTXOs With Minimum Confirmations */
    min_confirmations?: number;
    /** Minimum HTLC Millitokens */
    min_htlc_mtokens?: string;
    /** Public Key Hex */
    partner_public_key: string;
    /** Peer Output CSV Delay */
    partner_csv_delay?: number;
    /** Peer Connection Host:Port */
    partner_socket?: string;
  };
  export type OpenChannelResult = {
    /** Funding Transaction Id */
    transaction_id: string;
    /** Funding Transaction Output Index */
    transaction_vout: number;
  };
  /**
   * Open a new channel.
   *
   * The capacity of the channel is set with local_tokens
   *
   * If give_tokens is set, it is a gift and it does not alter the capacity
   *
   * Requires `offchain:write`, `onchain:write`, `peers:write` permissions
   */
  export const openChannel: AuthenticatedLNDMethod<
    OpenChannelArgs,
    OpenChannelResult
  >;

  export type OpenChannelsArgs = {
    channels: {
      /** Channel Capacity Tokens */
      capacity: number;
      /** Restrict Coop Close To Address */
      cooperative_close_address?: string;
      /** Tokens to Gift To Partner */
      give_tokens?: number;
      /** Channel is Private */
      is_private?: boolean;
      /** Minimum HTLC Millitokens */
      min_htlc_mtokens?: string;
      /** Public Key Hex */
      partner_public_key: string;
      /** Peer Output CSV Delay */
      partner_csv_delay?: number;
      /** Peer Connection Host:Port */
      partner_socket?: string;
    }[];
  };
  export type OpenChannelsResult = {
    pending: {
      /** Address To Send To */
      address: string;
      /** Pending Channel Id Hex */
      id: string;
      /** Tokens to Send */
      tokens: number;
    }[];
  };
  /**
	 *	Open one or more channels
	 *
   * Requires `offchain:write`, `onchain:write` permissions
	 *
* After getting the addresses and tokens to fund, use `fundChannels` within ten
minutes to fund the channels.
	 *
	 * If you do not fund the channels, be sure to `cancelPendingChannel`s on each
channel that was not funded.
	 */
  export const openChannels: AuthenticatedLNDMethod<
    OpenChannelsArgs,
    OpenChannelsResult
  >;

  export type ParsePaymentRequestArgs = {
    /** BOLT 11 Payment Request */
    request: string;
  };
  export type ParsePaymentRequestResult = {
    /** Chain Address */
    chain_addresses?: string[];
    /** CLTV Delta */
    cltv_delta: number;
    /** Invoice Creation Date ISO 8601 */
    created_at: string;
    /** Description */
    description?: string;
    /** Description Hash Hex */
    description_hash?: string;
    /** Public Key */
    destination: string;
    /** ISO 8601 Date */
    expires_at: string;
    features: {
      /** BOLT 09 Feature Bit */
      bit: number;
      /** Feature Support is Required To Pay */
      is_required: boolean;
      /** Feature Type */
      type: string;
    }[];
    /** Payment Request Hash */
    id: string;
    /** Invoice is Expired */
    is_expired: boolean;
    /** Requested Milli-Tokens Value string> (can exceed number limit) */
    mtokens?: string;
    /** Network Name */
    network: string;
    /** Payment Identifier Hex Encoded */
    payment?: string;
    routes?: {
      /** Base Fee Millitokens */
      base_fee_mtokens?: string;
      /** Standard Format Channel Id */
      channel?: string;
      /** Final CLTV Expiration Blocks Delta */
      cltv_delta?: number;
      /** Fee Rate Millitokens Per Million */
      fee_rate?: number;
      /** Forward Edge Public Key Hex */
      public_key: string;
    }[][];
    /** Requested Tokens Rounded Up */
    safe_tokens?: number;
    /** Requested Chain Tokens */
    tokens?: number;
  };
  /**
   * Parse a BOLT 11 payment request into its component data
   *
   * Note: either `description` or `description_hash` will be returned
   */
  export const parsePaymentRequest: (
    args: ParsePaymentRequestArgs
  ) => ParsePaymentRequestResult;

  export type PayArgs = {
    /** Pay Through Specific Final Hop Public Key Hex */
    incoming_peer?: string;
    /** Maximum Additional Fee Tokens To Pay */
    max_fee?: number;
    /** Maximum Fee Millitokens to Pay */
    max_fee_mtokens?: string;
    /** Maximum Simultaneous Paths */
    max_paths?: number;
    /** Max CLTV Timeout */
    max_timeout_height?: number;
    messages?: {
      /** Message Type number */
      type: string;
      /** Message Raw Value Hex Encoded */
      value: string;
    }[];
    /** Millitokens to Pay */
    mtokens?: string;
    /** Pay Through Outbound Standard Channel Id */
    outgoing_channel?: string;
    /** Pay Out of Outgoing Channel Ids */
    outgoing_channels?: string[];
    path?: {
      /** Payment Hash Hex */
      id: string;
      routes: {
        /** Total Fee Tokens To Pay */
        fee: number;
        /** Total Fee Millitokens To Pay */
        fee_mtokens: string;
        hops: {
          /** Standard Format Channel Id */
          channel: string;
          /** Channel Capacity Tokens */
          channel_capacity: number;
          /** Fee */
          fee: number;
          /** Fee Millitokens */
          fee_mtokens: string;
          /** Forward Tokens */
          forward: number;
          /** Forward Millitokens */
          forward_mtokens: string;
          /** Public Key Hex */
          public_key?: string;
          /** Timeout Block Height */
          timeout: number;
        }[];
        messages?: {
          /** Message Type number */
          type: string;
          /** Message Raw Value Hex Encoded */
          value: string;
        }[];
        /** Total Millitokens To Pay */
        mtokens: string;
        /** Payment Identifier Hex */
        payment?: string;
        /** Expiration Block Height */
        timeout: number;
        /** Total Tokens To Pay */
        tokens: number;
      }[];
    };
    /** Time to Spend Finding a Route Milliseconds */
    pathfinding_timeout?: number;
    /** BOLT 11 Payment Request */
    request?: string;
    /** Total Tokens To Pay to Payment Request */
    tokens?: number;
  };
  export type PayResult = {
    /** Fee Paid Tokens */
    fee: number;
    /** Fee Paid Millitokens */
    fee_mtokens: string;
    hops: {
      /** Standard Format Channel Id */
      channel: string;
      /** Hop Channel Capacity Tokens */
      channel_capacity: number;
      /** Hop Forward Fee Millitokens */
      fee_mtokens: string;
      /** Hop Forwarded Millitokens */
      forward_mtokens: string;
      /** Hop CLTV Expiry Block Height */
      timeout: number;
    }[];
    /** Payment Hash Hex */
    id: string;
    /** Is Confirmed */
    is_confirmed: boolean;
    /** Is Outoing */
    is_outgoing: boolean;
    /** Total Millitokens Sent */
    mtokens: string;
    /** Payment Forwarding Fee Rounded Up Tokens */
    safe_fee: number;
    /** Payment Tokens Rounded Up */
    safe_tokens: number;
    /** Payment Secret Preimage Hex */
    secret: string;
    /** Total Tokens Sent */
    tokens: number;
  };
  /**
   * Make a payment.
   *
   * Either a payment path or a BOLT 11 payment request is required
   *
   * For paying to private destinations along set paths, a public key in the route hops is required to form the route.
   *
   * Requires `offchain:write` permission
   */
  export const pay: AuthenticatedLNDMethod<PayArgs, PayResult>;

  export type PayViaPaymentDetailsArgs = {
    /** Final CLTV Delta */
    cltv_delta?: number;
    /** Destination Public Key */
    destination: string;
    features?: {
      /** Feature Bit */
      bit: number;
    }[];
    /** Payment Request Hash Hex */
    id?: string;
    /** Pay Through Specific Final Hop Public Key Hex */
    incoming_peer?: string;
    /** Maximum Fee Tokens To Pay */
    max_fee?: number;
    /** Maximum Fee Millitokens to Pay */
    max_fee_mtokens?: string;
    /** Maximum Simultaneous Paths */
    max_paths?: number;
    /** Maximum Expiration CLTV Timeout Height */
    max_timeout_height?: number;
    messages?: {
      /** Message Type number */
      type: string;
      /** Message Raw Value Hex Encoded */
      value: string;
    }[];
    /** Millitokens to Pay */
    mtokens?: string;
    /** Pay Out of Outgoing Channel Id */
    outgoing_channel?: string;
    /** Pay Out of Outgoing Channel Ids */
    outgoing_channels?: string[];
    /** Time to Spend Finding a Route Milliseconds */
    pathfinding_timeout?: number;
    routes: {
      /** Base Routing Fee In Millitokens */
      base_fee_mtokens?: string;
      /** Standard Format Channel Id */
      channel?: string;
      /** CLTV Blocks Delta */
      cltv_delta?: number;
      /** Fee Rate In Millitokens Per Million */
      fee_rate?: number;
      /** Forward Edge Public Key Hex */
      public_key: string;
    }[][];
    /** Tokens To Pay */
    tokens?: number;
  };
  export type PayViaPaymentDetailsResult = {
    /** Total Fee Tokens Paid Rounded Down */
    fee: number;
    /** Total Fee Millitokens Paid */
    fee_mtokens: string;
    hops: {
      /** First Route Standard Format Channel Id */
      channel: string;
      /** First Route Channel Capacity Tokens */
      channel_capacity: number;
      /** First Route Fee Tokens Rounded Down */
      fee: number;
      /** First Route Fee Millitokens */
      fee_mtokens: string;
      /** First Route Forward Millitokens */
      forward_mtokens: string;
      /** First Route Public Key Hex */
      public_key: string;
      /** First Route Timeout Block Height */
      timeout: number;
    }[];
    /** Payment Hash Hex */
    id: string;
    /** Total Millitokens Paid */
    mtokens: string;
    paths: {
      /** Total Fee Millitokens Paid */
      fee_mtokens: string;
      hops: {
        /** First Route Standard Format Channel Id */
        channel: string;
        /** First Route Channel Capacity Tokens */
        channel_capacity: number;
        /** First Route Fee Tokens Rounded Down */
        fee: number;
        /** First Route Fee Millitokens */
        fee_mtokens: string;
        /** First Route Forward Millitokens */
        forward_mtokens: string;
        /** First Route Public Key Hex */
        public_key: string;
        /** First Route Timeout Block Height */
        timeout: number;
      }[];
      /** Total Millitokens Paid */
      mtokens: string;
    }[];
    /** Total Fee Tokens Paid Rounded Up */
    safe_fee: number;
    /** Total Tokens Paid, Rounded Up */
    safe_tokens: number;
    /** Payment Preimage Hex */
    secret: string;
    /** Expiration Block Height */
    timeout: number;
    /** Total Tokens Paid Rounded Down */
    tokens: number;
  };
  /**
   * Pay via payment details
   *
   * If no id is specified, a random id will be used.
   *
   * Requires `offchain:write` permission
   */
  export const payViaPaymentDetails: AuthenticatedLNDMethod<
    PayViaPaymentDetailsArgs,
    PayViaPaymentDetailsResult
  >;

  export type PayViaPaymentRequestArgs = {
    /** Pay Through Specific Final Hop Public Key Hex */
    incoming_peer?: string;
    /** Maximum Fee Tokens To Pay */
    max_fee?: number;
    /** Maximum Fee Millitokens to Pay */
    max_fee_mtokens?: string;
    /** Maximum Simultaneous Paths */
    max_paths?: number;
    /** Maximum Height of Payment Timeout */
    max_timeout_height?: number;
    messages?: {
      /** Message Type number */
      type: string;
      /** Message Raw Value Hex Encoded */
      value: string;
    }[];
    /** Millitokens to Pay */
    mtokens?: string;
    /** Pay Out of Outgoing Channel Id */
    outgoing_channel?: string;
    /** Pay Out of Outgoing Channel Ids */
    outgoing_channels?: string[];
    /** Time to Spend Finding a Route Milliseconds */
    pathfinding_timeout?: number;
    /** BOLT 11 Payment Request */
    request: string;
    /** Tokens To Pay */
    tokens?: number;
  };
  export type PayViaPaymentRequestResult = {
    /** Total Fee Tokens Paid Rounded Down */
    fee: number;
    /** Total Fee Millitokens Paid */
    fee_mtokens: string;
    hops: {
      /** First Route Standard Format Channel Id */
      channel: string;
      /** First Route Channel Capacity Tokens */
      channel_capacity: number;
      /** First Route Fee Tokens Rounded Down */
      fee: number;
      /** First Route Fee Millitokens */
      fee_mtokens: string;
      /** First Route Forward Millitokens */
      forward_mtokens: string;
      /** First Route Public Key Hex */
      public_key: string;
      /** First Route Timeout Block Height */
      timeout: number;
    }[];
    /** Payment Hash Hex */
    id: string;
    /** Total Millitokens Paid */
    mtokens: string;
    paths: {
      /** Total Fee Millitokens Paid */
      fee_mtokens: string;
      hops: {
        /** First Route Standard Format Channel Id */
        channel: string;
        /** First Route Channel Capacity Tokens */
        channel_capacity: number;
        /** First Route Fee Tokens Rounded Down */
        fee: number;
        /** First Route Fee Millitokens */
        fee_mtokens: string;
        /** First Route Forward Millitokens */
        forward_mtokens: string;
        /** First Route Public Key Hex */
        public_key: string;
        /** First Route Timeout Block Height */
        timeout: number;
      }[];
      /** Total Millitokens Paid */
      mtokens: string;
    }[];
    /** Total Fee Tokens Paid Rounded Up */
    safe_fee: number;
    /** Total Tokens Paid, Rounded Up */
    safe_tokens: number;
    /** Payment Preimage Hex */
    secret: string;
    /** Expiration Block Height */
    timeout: number;
    /** Total Tokens Paid Rounded Down */
    tokens: number;
  };
  /**
   * Pay via payment request
   *
   * Requires `offchain:write` permission
   */
  export const payViaPaymentRequest: AuthenticatedLNDMethod<
    PayViaPaymentRequestArgs,
    PayViaPaymentRequestResult
  >;

  export type PayViaRoutesArgs = {
    /** Payment Hash Hex */
    id?: string;
    /** Time to Spend Finding a Route Milliseconds */
    pathfinding_timeout?: number;
    routes: {
      /** Total Fee Tokens To Pay */
      fee: number;
      /** Total Fee Millitokens To Pay */
      fee_mtokens: string;
      hops: {
        /** Standard Format Channel Id */
        channel: string;
        /** Channel Capacity Tokens */
        channel_capacity: number;
        /** Fee */
        fee: number;
        /** Fee Millitokens */
        fee_mtokens: string;
        /** Forward Tokens */
        forward: number;
        /** Forward Millitokens */
        forward_mtokens: string;
        /** Public Key Hex */
        public_key?: string;
        /** Timeout Block Height */
        timeout: number;
      }[];
      messages?: {
        /** Message Type number */
        type: string;
        /** Message Raw Value Hex Encoded */
        value: string;
      }[];
      /** Total Millitokens To Pay */
      mtokens: string;
      /** Expiration Block Height */
      timeout: number;
      /** Total Tokens To Pay */
      tokens: number;
    }[];
  };
  export type PayViaRoutesResult = {
    failures: LNServiceError[];
    /** Fee Paid Tokens */
    fee: number;
    /** Fee Paid Millitokens */
    fee_mtokens: string;
    hops: {
      /** Standard Format Channel Id */
      channel: string;
      /** Hop Channel Capacity Tokens */
      channel_capacity: number;
      /** Hop Forward Fee Millitokens */
      fee_mtokens: string;
      /** Hop Forwarded Millitokens */
      forward_mtokens: string;
      /** Hop CLTV Expiry Block Height */
      timeout: number;
    }[];
    /** Payment Hash Hex */
    id: string;
    /** Is Confirmed */
    is_confirmed: boolean;
    /** Is Outoing */
    is_outgoing: boolean;
    /** Total Millitokens Sent */
    mtokens: string;
    /** Payment Forwarding Fee Rounded Up Tokens */
    safe_fee: number;
    /** Payment Tokens Rounded Up */
    safe_tokens: number;
    /** Payment Secret Preimage Hex */
    secret: string;
    /** Total Tokens Sent Rounded Down */
    tokens: number;
  };
  /**
   * Make a payment via a specified route
   *
   * If no id is specified, a random id will be used to send a test payment
   *
   * Requires `offchain:write` permission
   */
  export const payViaRoutes: AuthenticatedLNDMethod<
    PayViaRoutesArgs,
    PayViaRoutesResult
  >;

  export type PrepareForChannelProposalArgs = {
    /** Cooperative Close Relative Delay */
    cooperative_close_delay?: number;
    /** Pending Id Hex */
    id?: string;
    /** Channel Funding Output Multisig Local Key Index */
    key_index: number;
    /** Channel Funding Partner Multisig Public Key Hex */
    remote_key: string;
    /** Funding Output Transaction Id Hex */
    transaction_id: string;
    /** Funding Output Transaction Output Index */
    transaction_vout: number;
  };
  export type PrepareForChannelProposalResult = {
    /** Pending Channel Id Hex */
    id: string;
  };
  /**
	 * Prepare for a channel proposal
	 * 
	 * Channel proposals can be made with `propose_channel`. Channel proposals can
allow for cooperative close delays or external funding flows.
	 *
	 * Requires `offchain:write`, `onchain:write` permissions
	 */
  export const prepareForChannelProposal: AuthenticatedLNDMethod<
    PrepareForChannelProposalArgs,
    PrepareForChannelProposalResult
  >;

  export type ProbeForRouteArgs = {
    /** Final CLTV Delta */
    cltv_delta?: number;
    /** Destination Public Key Hex */
    destination: string;
    features?: {
      /** Feature Bit */
      bit: number;
    }[];
    ignore?: {
      /** Channel Id */
      channel?: string;
      /** Public Key Hex */
      from_public_key: string;
      /** To Public Key Hex */
      to_public_key?: string;
    }[];
    /** Incoming Peer Public Key Hex */
    incoming_peer?: string;
    /** Adjust Probe For Past Routing Failures */
    is_ignoring_past_failures?: boolean;
    /** Only Route Through Specified Paths */
    is_strict_hints?: boolean;
    /** Maximum Fee Tokens */
    max_fee?: number;
    /** Maximum Fee Millitokens to Pay */
    max_fee_mtokens?: string;
    /** Maximum Height of Payment Timeout */
    max_timeout_height?: number;
    messages?: {
      /** Message To Final Destination Type number */
      type: string;
      /** Message To Final Destination Raw Value Hex Encoded */
      value: string;
    }[];
    /** Millitokens to Pay */
    mtokens?: string;
    /** Outgoing Channel Id */
    outgoing_channel?: string;
    /** Time to Spend On A Path Milliseconds */
    path_timeout_ms?: number;
    /** Payment Identifier Hex */
    payment?: string;
    /** Probe Timeout Milliseconds */
    probe_timeout_ms?: number;
    routes?: {
      /** Base Routing Fee In Millitokens */
      base_fee_mtokens?: number;
      /** Channel Capacity Tokens */
      channel_capacity?: number;
      /** Standard Format Channel Id */
      channel?: string;
      /** CLTV Blocks Delta */
      cltv_delta?: number;
      /** Fee Rate In Millitokens Per Million */
      fee_rate?: number;
      /** Forward Edge Public Key Hex */
      public_key: string;
    }[][];
    /** Tokens */
    tokens: number;
    /** Total Millitokens Across Paths */
    total_mtokens?: string;
  };
  export type ProbeForRouteResult = {
    route?: {
      /** Route Confidence Score Out Of One Million */
      confidence?: number;
      /** Route Fee Tokens Rounded Down */
      fee: number;
      /** Route Fee Millitokens */
      fee_mtokens: string;
      hops: {
        /** Standard Format Channel Id */
        channel: string;
        /** Channel Capacity Tokens */
        channel_capacity: number;
        /** Fee */
        fee: number;
        /** Fee Millitokens */
        fee_mtokens: string;
        /** Forward Tokens */
        forward: number;
        /** Forward Millitokens */
        forward_mtokens: string;
        /** Forward Edge Public Key Hex */
        public_key: string;
        /** Timeout Block Height */
        timeout: number;
      }[];
      messages?: {
        /** Message Type number */
        type: string;
        /** Message Raw Value Hex Encoded */
        value: string;
      }[];
      /** Total Fee-Inclusive Millitokens */
      mtokens: string;
      /** Payment Identifier Hex */
      payment?: string;
      /** Payment Forwarding Fee Rounded Up Tokens */
      safe_fee: number;
      /** Payment Tokens Rounded Up */
      safe_tokens: number;
      /** Timeout Block Height */
      timeout: number;
      /** Total Fee-Inclusive Tokens Rounded Down */
      tokens: number;
      /** Total Millitokens */
      total_mtokens?: string;
    };
  };
  /**
   * Probe to find a successful route
   *
   * Requires `offchain:write` permission
   */
  export const probeForRoute: AuthenticatedLNDMethod<
    ProbeForRouteArgs,
    ProbeForRouteResult
  >;

  export type ProposeChannelArgs = {
    /** Channel Capacity Tokens */
    capacity: number;
    /** Restrict Cooperative Close To Address */
    cooperative_close_address?: string;
    /** Cooperative Close Relative Delay */
    cooperative_close_delay?: number;
    /** Tokens to Gift To Partner */
    give_tokens?: number;
    /** Pending Channel Id Hex */
    id: string;
    /** Channel is Private */
    is_private?: boolean;
    /** Channel Funding Output MultiSig Local Key Index */
    key_index: number;
    /** Public Key Hex */
    partner_public_key: string;
    /** Channel Funding Partner MultiSig Public Key Hex */
    remote_key: string;
    /** Funding Output Transaction Id Hex */
    transaction_id: string;
    /** Funding Output Transaction Output Index */
    transaction_vout: number;
  };
  /**
	 * Propose a new channel to a peer that prepared for the channel proposal
	 * 
	 * Channel proposals can allow for cooperative close delays or external funding
flows.
	 *
	 * Requires `offchain:write`, `onchain:write` permissions
	 *
	 * Requires LND compiled with `walletrpc` build tag
	 */
  export const proposeChannel: AuthenticatedLNDMethod<ProposeChannelArgs>;

  export type RecoverFundsFromChannelArgs = {
    /** Backup Hex */
    backup: string;
  };
  /**
   * Verify and restore a channel from a single channel backup
   *
   * Requires `offchain:write` permission
   */
  export const recoverFundsFromChannel: AuthenticatedLNDMethod<RecoverFundsFromChannelArgs>;

  export type RecoverFundsFromChannelsArgs = {
    /** Backup Hex */
    backup: string;
  };
  /**
   * Verify and restore channels from a multi-channel backup
   *
   * Requires `offchain:write` permission
   */
  export const recoverFundsFromChannels: AuthenticatedLNDMethod<RecoverFundsFromChannelsArgs>;

  export type RemovePeerArgs = {
    /** Public Key Hex */
    public_key: string;
  };
  /**
   * Remove a peer if possible
   *
   * Requires `peers:remove` permission
   */
  export const removePeer: AuthenticatedLNDMethod<RemovePeerArgs>;

  export type RestrictMacaroonArgs = {
    /** Expires At ISO 8601 Date */
    expires_at?: string;
    /** IP Address */
    ip?: string;
    /** Base64 Encoded Macaroon */
    macaroon: string;
  };
  export type RestrictMacaroonResult = {
    /** Restricted Base64 Encoded Macaroon */
    macaroon: string;
  };
  /**
   * Restrict an access macaroon
   */
  export const restrictMacaroon: (
    args: RestrictMacaroonArgs
  ) => RestrictMacaroonResult;

  export type RevokeAccessArgs = {
    /** Access Token Macaroon Root Id Positive Integer */
    id: string;
  };
  /**
   * Revoke an access token given out in the past
   *
   * Note: this method is not supported in LND versions 0.11.0 and below
   *
   * Requires `macaroon:write` permission
   */
  export const revokeAccess: AuthenticatedLNDMethod<RevokeAccessArgs>;

  export type RouteFromChannelsArgs = {
    channels: {
      /** Maximum Tokens */
      capacity: number;
      /** Next Node Public Key Hex */
      destination?: string;
      /** Standard Format Channel Id */
      id: string;
      policies: {
        /** Base Fee Millitokens */
        base_fee_mtokens: string;
        /** Locktime Delta */
        cltv_delta: number;
        /** Fees Charged Per Million Tokens */
        fee_rate: number;
        /** Channel Is Disabled */
        is_disabled: boolean;
        /** Minimum HTLC Millitokens Value */
        min_htlc_mtokens: string;
        /** Node Public Key */
        public_key: string;
      }[];
    }[];
    /** Final CLTV Delta */
    cltv_delta?: number;
    /** Destination Public Key Hex */
    destination?: string;
    /** Current Block Height */
    height: number;
    messages?: {
      /** Message Type number */
      type: string;
      /** Message Raw Value Hex Encoded */
      value: string;
    }[];
    /** Millitokens To Send */
    mtokens: string;
    /** Payment Identification Value Hex */
    payment?: string;
    /** Sum of Shards Millitokens */
    total_mtokens?: string;
  };
  export type RouteFromChannelsResult = {
    route: {
      /** Total Fee Tokens To Pay */
      fee: number;
      /** Total Fee Millitokens To Pay */
      fee_mtokens: string;
      hops: {
        /** Standard Format Channel Id */
        channel: string;
        /** Channel Capacity Tokens */
        channel_capacity: number;
        /** Fee */
        fee: number;
        /** Fee Millitokens */
        fee_mtokens: string;
        /** Forward Tokens */
        forward: number;
        /** Forward Millitokens */
        forward_mtokens: string;
        /** Public Key Hex */
        public_key?: string;
        /** Timeout Block Height */
        timeout: number;
      }[];
      messages?: {
        /** Message Type number */
        type: string;
        /** Message Raw Value Hex Encoded */
        value: string;
      }[];
      /** Total Fee-Inclusive Millitokens */
      mtokens: string;
      /** Payment Identification Value Hex */
      payment?: string;
      /** Timeout Block Height */
      timeout: number;
      /** Total Fee-Inclusive Tokens */
      tokens: number;
      /** Sum of Shards Millitokens */
      total_mtokens?: string;
    };
  };
  /**
   * Get a route from a sequence of channels
   *
   * Either next hop destination in channels or final destination is require
   */
  export const routeFromChannels: (
    args: RouteFromChannelsArgs
  ) => RouteFromChannelsResult;

  export type SendToChainAddressArgs = {
    /** Destination Chain Address */
    address: string;
    /** Transaction Label */
    description?: string;
    /** Chain Fee Tokens Per Virtual Byte */
    fee_tokens_per_vbyte?: number;
    /** Send All Funds */
    is_send_all?: boolean;
    /** Log */
    log?: Function;
    /** Confirmations To Wait */
    target_confirmations?: number;
    /** Tokens To Send */
    tokens: number;
    /** Minimum Confirmations for UTXO Selection */
    utxo_confirmations?: number;
    /** Web Socket Servers */
    wss?: ws.Server[];
  };
  export type SendToChainAddressResult = {
    /** Total Confirmations */
    confirmation_count: number;
    /** Transaction Id Hex */
    id: string;
    /** Transaction Is Confirmed */
    is_confirmed: boolean;
    /** Transaction Is Outgoing */
    is_outgoing: boolean;
    /** Transaction Tokens */
    tokens: number;
  };
  /**
   * Send tokens in a blockchain transaction.
   *
   * Requires `onchain:write` permission
   *
   * `utxo_confirmations` is not supported on LND 0.11.1 or below
   */
  export const sendToChainAddress: AuthenticatedLNDMethod<
    SendToChainAddressArgs,
    SendToChainAddressResult
  >;

  export type SendToChainAddressesArgs = {
    /** Transaction Label */
    description?: string;
    /** Chain Fee Tokens Per Virtual Byte */
    fee_tokens_per_vbyte?: number;
    /** Log */
    log?: Function;
    send_to: {
      /** Address */
      address: string;
      /** Tokens */
      tokens: number;
    }[];
    /** Confirmations To Wait */
    target_confirmations?: number;
    /** Minimum Confirmations for UTXO Selection */
    utxo_confirmations?: number;
    /** Web Socket Servers */
    wss?: ws.Server[];
  };
  export type SendToChainAddressesResult = {
    /** Total Confirmations */
    confirmation_count: number;
    /** Transaction Id Hex */
    id: string;
    /** Transaction Is Confirmed */
    is_confirmed: boolean;
    /** Transaction Is Outgoing */
    is_outgoing: boolean;
    /** Transaction Tokens */
    tokens: number;
  };
  /**
   * Send tokens to multiple destinations in a blockchain transaction.
   *
   * Requires `onchain:write` permission
   *
   * `utxo_confirmations` is not supported on LND 0.11.1 or belo
   */
  export const sendToChainAddresses: AuthenticatedLNDMethod<
    SendToChainAddressesArgs,
    SendToChainAddressesResult
  >;

  export type SetAutopilotArgs = {
    candidate_nodes?: {
      /** Node Public Key Hex */
      public_key: string;
      /** Score */
      score: number;
    }[];
    /** Enable Autopilot */
    is_enabled?: boolean;
  };
  /**
   * Configure Autopilot settings
   *
   * Either `candidate_nodes` or `is_enabled` is required
   *
   * Candidate node scores range from 1 to 100,000,000
   *
   * Permissions `info:read`, `offchain:write`, `onchain:write` are required
   */
  export const setAutopilot: AuthenticatedLNDMethod<SetAutopilotArgs>;

  export type SettleHodlInvoiceArgs = {
    /** Payment Preimage Hex */
    secret: string;
  };
  /**
   * Settle HODL invoice
   *
   * Requires LND built with `invoicesrpc` build tag
   *
   * Requires `invoices:write` permission
   */
  export const settleHodlInvoice: AuthenticatedLNDMethod<SettleHodlInvoiceArgs>;

  export type SignBytesArgs = {
    /** Key Family */
    key_family: number;
    /** Key Index */
    key_index: number;
    /** Bytes To Hash and Sign Hex Encoded */
    preimage: string;
  };
  export type SignBytesResult = {
    /** Signature Hex */
    signature: string;
  };
  /**
   * Sign a sha256 hash of arbitrary bytes
   *
   * Requires LND built with `signrpc` build tag
   *
   * Requires `signer:generate` permission
   */
  export const signBytes: AuthenticatedLNDMethod<
    SignBytesArgs,
    SignBytesResult
  >;

  export type SignMessageArgs = {
    /** Message */
    message: string;
  };
  export type SignMessageResult = {
    /** Signature */
    signature: string;
  };
  /**
   * Sign a message
   *
   * Requires `message:write` permission
   */
  export const signMessage: AuthenticatedLNDMethod<
    SignMessageArgs,
    SignMessageResult
  >;

  export type SignPSBTArgs = {
    /** Funded PSBT Hex */
    psbt: string;
  };
  export type SignPSBTResult = {
    /** Finalized PSBT Hex */
    psbt: string;
    /** Signed Raw Transaction Hex */
    transaction: string;
  };
  /**
   * Sign a PSBT to produce a finalized PSBT that is ready to broadcast
   *
   * Requires `onchain:write` permission
   *
   * Requires LND built with `walletrpc` tag
   *
   * This method is not supported in LND 0.11.1 and below
   */
  export const signPsbt: AuthenticatedLNDMethod<SignPSBTArgs, SignPSBTResult>;

  export type SignTransactionArgs = {
    inputs: {
      /** Key Family */
      key_family: number;
      /** Key Index */
      key_index: number;
      /** Output Script Hex */
      output_script: string;
      /** Output Tokens */
      output_tokens: number;
      /** Sighash Type */
      sighash: number;
      /** Input Index To Sign */
      vin: number;
      /** Witness Script Hex */
      witness_script: string;
    }[];
    /** Unsigned Transaction Hex */
    transaction: string;
  };
  export type SignTransactionResult = {
    /** Signature Hex Strings */
    signatures: string[];
  };
  /**
   * Sign transaction
   *
   * Requires LND built with `signerrpc` build tag
   *
   * Requires `signer:generate` permission
   */
  export const signTransaction: AuthenticatedLNDMethod<
    SignTransactionArgs,
    SignTransactionResult
  >;

  /**
   * Stop the Lightning daemon.
   *
   * Requires `info:write` permission
   */
  export const stopDaemon: AuthenticatedLNDMethod;

  export type SubscribeToBackupsBackupEvent = {
    /** Backup Hex */
    backup: string;
    channels: {
      /** Backup Hex */
      backup: string;
      /** Funding Transaction Id Hex */
      transaction_id: string;
      /** Funding Transaction Output Index */
      transaction_vout: number;
    }[];
  };
  /**
   * Subscribe to backup snapshot updates
   *
   * Requires `offchain:read` permission
   */
  export const subscribeToBackups: AuthenticatedLNDSubscription;

  export type SubscribeToBlocksBlockEvent = {
    /** Block Height */
    height: number;
    /** Block Hash */
    id: string;
  };
  /**
   * Subscribe to blocks
   *
   * Requires LND built with `chainrpc` build tag
   *
   * Requires `onchain:read` permission
   */
  export const subscribeToBlocks: AuthenticatedLNDSubscription;

  export type SubscribeToChainAddressArgs = {
    /** Address */
    bech32_address?: string;
    /** Minimum Confirmations */
    min_confirmations?: number;
    /** Minimum Transaction Inclusion Blockchain Height */
    min_height: number;
    /** Output Script Hex */
    output_script?: string;
    /** Address */
    p2pkh_address?: string;
    /** Address */
    p2sh_address?: string;
    /** Blockchain Transaction Id */
    transaction_id?: string;
  };
  export type SubscribeToChainAddressConfirmationEvent = {
    /** Block Hash Hex */
    block: string;
    /** Block Best Chain Height */
    height: number;
    /** Raw Transaction Hex */
    transaction: string;
  };
  export type SubscribeToChainAddressReorgEvent = undefined;
  /**
   * Subscribe to confirmation details about transactions sent to an address
   *
   * One and only one chain address or output script is required
   *
   * Requires LND built with `chainrpc` build tag
   *
   * Requires `onchain:read` permission
   */
  export const subscribeToChainAddress: AuthenticatedLNDSubscription<SubscribeToChainAddressArgs>;

  export type SubscribeToChainSpendArgs = {
    /** Bech32 P2WPKH or P2WSH Address */
    bech32_address?: string;
    /** Minimum Transaction Inclusion Blockchain Height */
    min_height: number;
    /** Output Script AKA ScriptPub Hex */
    output_script?: string;
    /** Pay to Public Key Hash Address */
    p2pkh_address?: string;
    /** Pay to Script Hash Address */
    p2sh_address?: string;
    /** Blockchain Transaction Id Hex */
    transaction_id?: string;
    /** Blockchain Transaction Output Index */
    transaction_vout?: number;
  };
  export type SubscribeToChainSpendConfirmationEvent = {
    /** Confirmation Block Height */
    height: number;
    /** Raw Transaction Hex */
    transaction: string;
    /** Spend Outpoint Index */
    vin: number;
  };
  export type SubscribeToChainSpendReorgEvent = undefined;
  /**
   * Subscribe to confirmations of a spend
   *
   * A chain address or raw output script is required
   *
   * Requires LND built with `chainrpc` build tag
   *
   * Requires `onchain:read` permission
   */
  export const subscribeToChainSpend: AuthenticatedLNDSubscription<SubscribeToChainSpendArgs>;

  export type SubscribeToChannelsChannelActiveChangedEvent = {
    /** Channel Is Active */
    is_active: boolean;
    /** Channel Funding Transaction Id */
    transaction_id: string;
    /** Channel Funding Transaction Output Index */
    transaction_vout: number;
  };
  export type SubscribeToChannelsChannelClosedEvent = {
    /** Closed Channel Capacity Tokens */
    capacity: number;
    /** Channel Balance Output Spent By Tx Id */
    close_balance_spent_by?: string;
    /** Channel Balance Close Tx Output Index */
    close_balance_vout?: number;
    /** Channel Close Confirmation Height */
    close_confirm_height?: number;
    close_payments: {
      /** Payment Is Outgoing */
      is_outgoing: boolean;
      /** Payment Is Claimed With Preimage */
      is_paid: boolean;
      /** Payment Resolution Is Pending */
      is_pending: boolean;
      /** Payment Timed Out And Went Back To Payer */
      is_refunded: boolean;
      /** Close Transaction Spent By Transaction Id Hex */
      spent_by?: string;
      /** Associated Tokens */
      tokens: number;
      /** Transaction Id Hex */
      transaction_id: string;
      /** Transaction Output Index */
      transaction_vout: number;
    }[];
    /** Closing Transaction Id Hex */
    close_transaction_id?: string;
    /** Channel Close Final Local Balance Tokens */
    final_local_balance: number;
    /** Closed Channel Timelocked Tokens */
    final_time_locked_balance: number;
    /** Closed Standard Format Channel Id */
    id?: string;
    /** Is Breach Close */
    is_breach_close: boolean;
    /** Is Cooperative Close */
    is_cooperative_close: boolean;
    /** Is Funding Cancelled Close */
    is_funding_cancel: boolean;
    /** Is Local Force Close */
    is_local_force_close: boolean;
    /** Channel Was Closed By Channel Peer */
    is_partner_closed?: boolean;
    /** Channel Was Initiated By Channel Peer */
    is_partner_initiated?: boolean;
    /** Is Remote Force Close */
    is_remote_force_close: boolean;
    /** Partner Public Key Hex */
    partner_public_key: string;
    /** Channel Funding Transaction Id Hex */
    transaction_id: string;
    /** Channel Funding Output Index */
    transaction_vout: number;
  };
  export type SubscribeToChannelsChannelOpenedEvent = {
    /** Channel Token Capacity */
    capacity: number;
    /** Commit Transaction Fee */
    commit_transaction_fee: number;
    /** Commit Transaction Weight */
    commit_transaction_weight: number;
    /** Coop Close Restricted to Address */
    cooperative_close_address?: string;
    /** Prevent Coop Close Until Height */
    cooperative_close_delay_height?: number;
    /** Standard Format Channel Id */
    id: string;
    /** Channel Active */
    is_active: boolean;
    /** Channel Is Closing */
    is_closing: boolean;
    /** Channel Is Opening */
    is_opening: boolean;
    /** Channel Partner Opened Channel */
    is_partner_initiated: boolean;
    /** Channel Is Private */
    is_private: boolean;
    /** Remote Key Is Static */
    is_static_remote_key: boolean;
    /** Local Balance Tokens */
    local_balance: number;
    /** Local Initially Pushed Tokens */
    local_given?: number;
    /** Local Reserved Tokens */
    local_reserve: number;
    /** Channel Partner Public Key */
    partner_public_key: string;
    pending_payments: {
      /** Payment Preimage Hash Hex */
      id: string;
      /** Payment Is Outgoing */
      is_outgoing: boolean;
      /** Chain Height Expiration */
      timeout: number;
      /** Payment Tokens */
      tokens: number;
    }[];
    /** Received Tokens */
    received: number;
    /** Remote Balance Tokens */
    remote_balance: number;
    /** Remote Initially Pushed Tokens */
    remote_given?: number;
    /** Remote Reserved Tokens */
    remote_reserve: number;
    /** Sent Tokens */
    sent: number;
    /** Blockchain Transaction Id */
    transaction_id: string;
    /** Blockchain Transaction Vout */
    transaction_vout: number;
    /** Unsettled Balance Tokens */
    unsettled_balance: number;
  };
  export type SubscribeToChannelsChannelOpeningEvent = {
    /** Blockchain Transaction Id Hex */
    transaction_id: string;
    /** Blockchain Transaction Output Index */
    transaction_vout: number;
  };
  /**
   * Subscribe to channel updates
   *
   * Requires `offchain:read` permission
   */
  export const subscribeToChannels: AuthenticatedLNDSubscription;

  export type SubscribeToForwardRequestsForwardRequestEvent = {
    accept: () => {};
    /** Difference Between Out and In CLTV Height */
    cltv_delta: number;
    /** Routing Fee Tokens Rounded Down */
    fee: number;
    /** Routing Fee Millitokens */
    fee_mtokens: string;
    /** Payment Hash Hex */
    hash: string;
    /** Inbound Standard Format Channel Id */
    in_channel: string;
    /** Inbound Channel Payment Id */
    in_payment: number;
    messages: {
      /** Message Type number */
      type: string;
      /** Raw Value Hex */
      value: string;
    }[];
    /** Millitokens to Forward To Next Peer */
    mtokens: string;
    /** Hex Serialized Next-Hop Onion Packet To Forward */
    onion?: string;
    /** Requested Outbound Channel Standard Format Id */
    out_channel: string;
    /** Reject Forward */
    reject: () => {};
    /** Short Circuit */
    settle: ({ secret: string }) => {};
    /** CLTV Timeout Height */
    timeout: number;
    /** Tokens to Forward to Next Peer Rounded Down */
    tokens: number;
  };
  /**
	 * Subscribe to requests to forward payments
	 * 
	 * Note that the outbound channel is only the requested channel, another may be
selected internally to complete the forward.
	 *
	 * Requires `offchain:read`, `offchain:write` permission
	 *
	 * `onion` is not supported in LND 0.11.1 and below
	 */
  export const subscribeToForwardRequests: AuthenticatedLNDSubscription;

  export type SubscribeToForwardsForwardEvent = {
    /** Forward Update At ISO 8601 Date */
    at: string;
    /** Public Failure Reason */
    external_failure?: string;
    /** Inbound Standard Format Channel Id */
    in_channel?: string;
    /** Inbound Channel Payment Id */
    in_payment?: number;
    /** Private Failure Reason */
    internal_failure?: string;
    /** Forward Is Confirmed */
    is_confirmed: boolean;
    /** Forward Is Failed */
    is_failed: boolean;
    /** Is Receive */
    is_receive: boolean;
    /** Is Send */
    is_send: boolean;
    /** Sending Millitokens */
    mtokens?: number;
    /** Outgoing Standard Format Channel Id */
    out_channel?: string;
    /** Outgoing Channel Payment Id */
    out_payment?: number;
    /** Forward Timeout at Height */
    timeout?: number;
    /** Sending Tokens */
    tokens?: number;
  };
  /**
   * Subscribe to HTLC events
   *
   * Requires `offchain:read` permissio
   */
  export const subscribeToForwards: AuthenticatedLNDSubscription;

  export type SubscribeToGraphChannelUpdatedEvent = {
    /** Channel Base Fee Millitokens */
    base_fee_mtokens: string;
    /** Channel Capacity Tokens */
    capacity: number;
    /** Channel CLTV Delta */
    cltv_delta: number;
    /** Channel Fee Rate In Millitokens Per Million */
    fee_rate: number;
    /** Standard Format Channel Id */
    id: string;
    /** Channel Is Disabled */
    is_disabled: boolean;
    /** Channel Maximum HTLC Millitokens */
    max_htlc_mtokens?: string;
    /** Channel Minimum HTLC Millitokens */
    min_htlc_mtokens: string;
    /** Announcing Public Key, Target Public Key */
    public_keys: [string, string];
    /** Channel Transaction Id */
    transaction_id: string;
    /** Channel Transaction Output Index */
    transaction_vout: number;
    /** Update Received At ISO 8601 Date */
    updated_at: string;
  };
  export type SubscribeToGraphChannelClosedEvent = {
    /** Channel Capacity Tokens */
    capacity?: number;
    /** Channel Close Confirmed Block Height */
    close_height: number;
    /** Standard Format Channel Id */
    id: string;
    /** Channel Transaction Id */
    transaction_id?: string;
    /** Channel Transaction Output Index */
    transaction_vout?: number;
    /** Update Received At ISO 8601 Date */
    updated_at: string;
  };
  export type SubscribeToGraphErrorEvent = Error;
  export type SubscribeToGraphNodeUpdatedEvent = {
    /** Node Alias */
    alias: string;
    /** Node Color */
    color: string;
    features: {
      /** BOLT 09 Feature Bit */
      bit: number;
      /** Feature is Known */
      is_known: boolean;
      /** Feature Support is Required */
      is_required: boolean;
      /** Feature Type */
      type: string;
    }[];
    /** Node Public Key */
    public_key: string;
    /** Network Hosts And Ports */
    sockets?: string[];
    /** Update Received At ISO 8601 Date */
    updated_at: string;
  };
  /**
   * Subscribe to graph updates
   *
   * Requires `info:read` permissio
   */
  export const subscribeToGraph: AuthenticatedLNDSubscription;

  export type SubscribeToInvoiceArgs = {
    /** Invoice Payment Hash Hex */
    id: string;
  };
  export type SubscribeToInvoiceInvoiceUpdatedEvent = {
    /** Fallback Chain Address */
    chain_address: string;
    /** Settled at ISO 8601 Date */
    confirmed_at?: string;
    /** ISO 8601 Date */
    created_at: string;
    /** Description */
    description: string;
    /** Description Hash Hex */
    description_hash: string;
    /** ISO 8601 Date */
    expires_at: string;
    features: {
      /** BOLT 09 Feature Bit */
      bit: number;
      /** Feature is Known */
      is_known: boolean;
      /** Feature Support is Required To Pay */
      is_required: boolean;
      /** Feature Type */
      type: string;
    }[];
    /** Payment Hash */
    id: string;
    /** Invoice is Canceled */
    is_canceled?: boolean;
    /** Invoice is Confirmed */
    is_confirmed: boolean;
    /** HTLC is Held */
    is_held?: boolean;
    /** Invoice is Outgoing */
    is_outgoing: boolean;
    /** Invoice is Private */
    is_private: boolean;
    /** Invoiced Millitokens */
    mtokens: string;
    payments: {
      /** Payment Settled At ISO 8601 Date */
      confirmed_at?: string;
      /** Payment Held Since ISO 860 Date */
      created_at: string;
      /** Payment Held Since Block Height */
      created_height: number;
      /** Incoming Payment Through Channel Id */
      in_channel: string;
      /** Payment is Canceled */
      is_canceled: boolean;
      /** Payment is Confirmed */
      is_confirmed: boolean;
      /** Payment is Held */
      is_held: boolean;
      messages: {
        /** Message Type number */
        type: string;
        /** Raw Value Hex */
        value: string;
      }[];
      /** Incoming Payment Millitokens */
      mtokens: string;
      /** Pending Payment Channel HTLC Index */
      pending_index?: number;
      /** Payment Tokens */
      tokens: number;
    }[];
    /** Received Tokens */
    received: number;
    /** Received Millitokens */
    received_mtokens: string;
    /** Bolt 11 Invoice */
    request: string;
    routes: {
      /** Base Routing Fee In Millitokens */
      base_fee_mtokens: number;
      /** Standard Format Channel Id */
      channel: string;
      /** CLTV Blocks Delta */
      cltv_delta: number;
      /** Fee Rate In Millitokens Per Million */
      fee_rate: number;
      /** Public Key Hex */
      public_key: string;
    }[][];
    /** Secret Preimage Hex */
    secret: string;
    /** Tokens */
    tokens: number;
  };
  /**
   * Subscribe to an invoice
   *
   * LND built with `invoicesrpc` tag is required
   *
   * Requires `invoices:read` permission
   */
  export const subscribeToInvoice: AuthenticatedLNDSubscription<SubscribeToInvoiceArgs>;

  export type SubscribeToInvoicesInvoiceUpdatedEvent = {
    /** Fallback Chain Address */
    chain_address?: string;
    /** Final CLTV Delta */
    cltv_delta: number;
    /** Confirmed At ISO 8601 Date */
    confirmed_at?: string;
    /** Created At ISO 8601 Date */
    created_at: string;
    /** Description */
    description: string;
    /** Description Hash Hex */
    description_hash: string;
    /** Expires At ISO 8601 Date */
    expires_at: string;
    features: {
      /** Feature Bit */
      bit: number;
      /** Is Known Feature */
      is_known: boolean;
      /** Feature Is Required */
      is_required: boolean;
      /** Feature Name */
      name: string;
    }[];
    /** Invoice Payment Hash Hex */
    id: string;
    /** Invoice is Confirmed */
    is_confirmed: boolean;
    /** Invoice is Outgoing */
    is_outgoing: boolean;
    /** Invoice is Push Payment */
    is_push?: boolean;
    payments: {
      /** Payment Settled At ISO 8601 Date */
      confirmed_at?: string;
      /** Payment Held Since ISO 860 Date */
      created_at: string;
      /** Payment Held Since Block Height */
      created_height: number;
      /** Incoming Payment Through Channel Id */
      in_channel: string;
      /** Payment is Canceled */
      is_canceled: boolean;
      /** Payment is Confirmed */
      is_confirmed: boolean;
      /** Payment is Held */
      is_held: boolean;
      messages: {
        /** Message Type number */
        type: string;
        /** Raw Value Hex */
        value: string;
      }[];
      /** Incoming Payment Millitokens */
      mtokens: string;
      /** Pending Payment Channel HTLC Index */
      pending_index?: number;
      /** Payment Tokens */
      tokens: number;
      /** Total Payment Millitokens */
      total_mtokens?: string;
    }[];
    /** Received Tokens */
    received: number;
    /** Received Millitokens */
    received_mtokens: string;
    /** BOLT 11 Payment Request */
    request?: string;
    /** Payment Secret Hex */
    secret: string;
    /** Invoiced Tokens */
    tokens: number;
  };
  /**
   * Subscribe to invoices
   *
   * Requires `invoices:read` permission
   */
  export const subscribeToInvoices: AuthenticatedLNDSubscription;

  export type SubscribeToOpenRequestsChannelRequestEvent = {
    /** Accept Request */
    accept: (args: {
      /** Restrict Coop Close To Address */
      cooperative_close_address?: string;
      /** Required Confirmations Before Channel Open */
      min_confirmations?: number;
      /** Peer Unilateral Balance Output CSV Delay */
      remote_csv?: number;
      /** Minimum Tokens Peer Must Keep On Their Side */
      remote_reserve?: number;
      /** Maximum Slots For Attaching HTLCs */
      remote_max_htlcs?: number;
      /** Maximum HTLCs Value Millitokens */
      remote_max_pending_mtokens?: string;
      /** Minimium HTLC Value Millitokens */
      remote_min_htlc_mtokens?: string;
    }) => {};
    /** Capacity Tokens */
    capacity: number;
    /** Chain Id Hex */
    chain: string;
    /** Commitment Transaction Fee */
    commit_fee_tokens_per_vbyte: number;
    /** CSV Delay Blocks */
    csv_delay: number;
    /** Request Id Hex */
    id: string;
    /** Channel Local Tokens Balance */
    local_balance: number;
    /** Channel Local Reserve Tokens */
    local_reserve: number;
    /** Maximum Millitokens Pending In Channel */
    max_pending_mtokens: string;
    /** Maximum Pending Payments */
    max_pending_payments: number;
    /** Minimum Chain Output Tokens */
    min_chain_output: number;
    /** Minimum HTLC Millitokens */
    min_htlc_mtokens: string;
    /** Peer Public Key Hex */
    partner_public_key: string;
    /** Reject Request */
    reject: (args: {
      /** 500 Character Limited Rejection Reason */
      reason?: string;
    }) => {};
  };
  /**
	 * Subscribe to inbound channel open requests
	 * 
	 * Requires `offchain:write`, `onchain:write` permissions
	 * 
	 * Note: listening to inbound channel requests will automatically fail all
channel requests after a short delay.
	 *
	 * To return to default behavior of accepting all channel requests, remove all
listeners to `channel_request`
	 *
	 * LND 0.11.1 and below do not support `accept` or `reject` arguments
	 */
  export const subscribeToOpenRequests: AuthenticatedLNDSubscription;

  export type SubscribeToPastPaymentArgs = {
    /** Payment Request Hash Hex */
    id: string;
  };
  export type SubscribeToPastPaymentConfirmedEvent = {
    /** Total Fee Millitokens To Pay */
    fee_mtokens: string;
    hops: {
      /** Standard Format Channel Id */
      channel: string;
      /** Channel Capacity Tokens */
      channel_capacity: number;
      /** Routing Fee Tokens */
      fee: number;
      /** Fee Millitokens */
      fee_mtokens: string;
      /** Forwarded Tokens */
      forward: number;
      /** Forward Millitokens */
      forward_mtokens: string;
      /** Public Key Hex */
      public_key: string;
      /** Timeout Block Height */
      timeout: number;
    }[];
    /** Payment Hash Hex */
    id: string;
    /** Total Millitokens Paid */
    mtokens: string;
    /** Payment Forwarding Fee Rounded Up Tokens */
    safe_fee: number;
    /** Payment Tokens Rounded Up */
    safe_tokens: number;
    /** Payment Preimage Hex */
    secret: string;
    /** Expiration Block Height */
    timeout: number;
    /** Tokens Paid */
    tokens: number;
  };
  export type SubscribeToPastPaymentFailedEvent = {
    /** Failed Due To Lack of Balance */
    is_insufficient_balance: boolean;
    /** Failed Due to Payment Rejected At Destination */
    is_invalid_payment: boolean;
    /** Failed Due to Pathfinding Timeout */
    is_pathfinding_timeout: boolean;
    /** Failed Due to Absence of Path Through Graph */
    is_route_not_found: boolean;
  };
  export type SubscribeToPastPaymentPayingEvent = {};
  /**
   * Subscribe to the status of a past payment
   *
   * Requires `offchain:read` permission
   */
  export const subscribeToPastPayment: AuthenticatedLNDSubscription<SubscribeToPastPaymentArgs>;

  export type SubscribeToPayViaDetailsArgs = {
    /** Final CLTV Delta */
    cltv_delta?: number;
    /** Destination Public Key */
    destination: string;
    features?: {
      /** Feature Bit */
      bit: number;
    }[];
    /** Payment Request Hash Hex */
    id?: string;
    /** Pay Through Specific Final Hop Public Key Hex */
    incoming_peer?: string;
    /** Maximum Fee Tokens To Pay */
    max_fee?: number;
    /** Maximum Fee Millitokens to Pay */
    max_fee_mtokens?: string;
    /** Maximum Simultaneous Paths */
    max_paths?: number;
    /** Maximum Height of Payment Timeout */
    max_timeout_height?: number;
    messages?: {
      /** Message Type number */
      type: string;
      /** Message Raw Value Hex Encoded */
      value: string;
    }[];
    /** Millitokens to Pay */
    mtokens?: string;
    /** Pay Out of Outgoing Channel Id */
    outgoing_channel?: string;
    /** Pay Out of Outgoing Channel Ids */
    outgoing_channels?: string[];
    /** Time to Spend Finding a Route Milliseconds */
    pathfinding_timeout?: number;
    routes?: [
      {
        /** Base Routing Fee In Millitokens */
        base_fee_mtokens?: string;
        /** Standard Format Channel Id */
        channel?: string;
        /** CLTV Blocks Delta */
        cltv_delta?: number;
        /** Fee Rate In Millitokens Per Million */
        fee_rate?: number;
        /** Forward Edge Public Key Hex */
        public_key: string;
      }[]
    ];
    /** Tokens to Pay */
    tokens?: number;
  };
  export type SubscribeToPayViaDetailsConfirmedEvent = {
    /** Fee Tokens Paid */
    fee: number;
    /** Total Fee Millitokens Paid */
    fee_mtokens: string;
    hops: {
      /** Standard Format Channel Id */
      channel: string;
      /** Channel Capacity Tokens */
      channel_capacity: number;
      /** Fee Millitokens */
      fee_mtokens: string;
      /** Forward Millitokens */
      forward_mtokens: string;
      /** Public Key Hex */
      public_key: string;
      /** Timeout Block Height */
      timeout: number;
    }[];
    /** Payment Hash Hex */
    id?: string;
    /** Total Millitokens To Pay */
    mtokens: string;
    /** Payment Forwarding Fee Rounded Up Tokens */
    safe_fee: number;
    /** Payment Tokens Rounded Up */
    safe_tokens: number;
    /** Payment Preimage Hex */
    secret: string;
    /** Total Tokens Paid Rounded Down */
    tokens: number;
  };
  export type SubscribeToPayViaDetailsFailedEvent = {
    /** Failed Due To Lack of Balance */
    is_insufficient_balance: boolean;
    /** Failed Due to Invalid Payment */
    is_invalid_payment: boolean;
    /** Failed Due to Pathfinding Timeout */
    is_pathfinding_timeout: boolean;
    /** Failed Due to Route Not Found */
    is_route_not_found: boolean;
    route?: {
      /** Route Total Fee Tokens Rounded Down */
      fee: number;
      /** Route Total Fee Millitokens */
      fee_mtokens: string;
      hops: {
        /** Standard Format Channel Id */
        channel: string;
        /** Channel Capacity Tokens */
        channel_capacity: number;
        /** Hop Forwarding Fee Rounded Down Tokens */
        fee: number;
        /** Hop Forwarding Fee Millitokens */
        fee_mtokens: string;
        /** Hop Forwarding Tokens Rounded Down */
        forward: number;
        /** Hop Forwarding Millitokens */
        forward_mtokens: string;
        /** Hop Sending To Public Key Hex */
        public_key: string;
        /** Hop CTLV Expiration Height */
        timeout: number;
      }[];
      /** Payment Sending Millitokens */
      mtokens: string;
      /** Payment Forwarding Fee Rounded Up Tokens */
      safe_fee: number;
      /** Payment Sending Tokens Rounded Up */
      safe_tokens: number;
      /** Payment CLTV Expiration Height */
      timeout: number;
      /** Payment Sending Tokens Rounded Down */
      tokens: number;
    };
  };
  export type SubscribeToPayViaDetailsPayingEvent = {};
  /**
   * Subscribe to the flight of a payment
   *
   * Requires `offchain:write` permission
   */
  export const subscribeToPayViaDetails: AuthenticatedLNDSubscription<SubscribeToPayViaDetailsArgs>;

  export type SubscribeToPayViaRequestArgs = {
    /** Pay Through Specific Final Hop Public Key Hex */
    incoming_peer?: string;
    /** Maximum Fee Tokens To Pay */
    max_fee?: number;
    /** Maximum Fee Millitokens to Pay */
    max_fee_mtokens?: string;
    /** Maximum Simultaneous Paths */
    max_paths?: number;
    /** Maximum Height of Payment Timeout */
    max_timeout_height?: number;
    messages?: {
      /** Message Type number */
      type: string;
      /** Message Raw Value Hex Encoded */
      value: string;
    }[];
    /** Millitokens to Pay */
    mtokens?: string;
    /** Pay Out of Outgoing Channel Id */
    outgoing_channel?: string;
    /** Pay Out of Outgoing Channel Ids */
    outgoing_channels?: string[];
    /** Time to Spend Finding a Route Milliseconds */
    pathfinding_timeout?: number;
    /** BOLT 11 Payment Request */
    request: string;
    /** Tokens To Pay */
    tokens?: number;
  };
  export type SubscribeToPayViaRequestConfirmedEvent = {
    /** Fee Tokens */
    fee: number;
    /** Total Fee Millitokens To Pay */
    fee_mtokens: string;
    hops: {
      /** Standard Format Channel Id */
      channel: string;
      /** Channel Capacity Tokens */
      channel_capacity: number;
      /** Fee Millitokens */
      fee_mtokens: string;
      /** Forward Millitokens */
      forward_mtokens: string;
      /** Public Key Hex */
      public_key: string;
      /** Timeout Block Height */
      timeout: number;
    }[];
    /** Payment Hash Hex */
    id: string;
    /** Total Millitokens Paid */
    mtokens: string;
    /** Payment Forwarding Fee Rounded Up Tokens */
    safe_fee: number;
    /** Payment Tokens Rounded Up */
    safe_tokens: number;
    /** Payment Preimage Hex */
    secret: string;
    /** Expiration Block Height */
    timeout: number;
    /** Total Tokens Paid */
    tokens: number;
  };
  export type SubscribeToPayViaRequestFailedEvent = {
    /** Failed Due To Lack of Balance */
    is_insufficient_balance: boolean;
    /** Failed Due to Invalid Payment */
    is_invalid_payment: boolean;
    /** Failed Due to Pathfinding Timeout */
    is_pathfinding_timeout: boolean;
    /** Failed Due to Route Not Found */
    is_route_not_found: boolean;
    route?: {
      /** Route Total Fee Tokens Rounded Down */
      fee: number;
      /** Route Total Fee Millitokens */
      fee_mtokens: string;
      hops: {
        /** Standard Format Channel Id */
        channel: string;
        /** Channel Capacity Tokens */
        channel_capacity: number;
        /** Hop Forwarding Fee Rounded Down Tokens */
        fee: number;
        /** Hop Forwarding Fee Millitokens */
        fee_mtokens: string;
        /** Hop Forwarding Tokens Rounded Down */
        forward: number;
        /** Hop Forwarding Millitokens */
        forward_mtokens: string;
        /** Hop Sending To Public Key Hex */
        public_key: string;
        /** Hop CTLV Expiration Height */
        timeout: number;
      }[];
      /** Payment Sending Millitokens */
      mtokens: string;
      /** Payment Forwarding Fee Rounded Up Tokens */
      safe_fee: number;
      /** Payment Sending Tokens Rounded Up */
      safe_tokens: number;
      /** Payment CLTV Expiration Height */
      timeout: number;
      /** Payment Sending Tokens Rounded Down */
      tokens: number;
    };
  };
  export type SubscribeToPayViaRequestPayingEvent = {};
  /**
   * Initiate and subscribe to the outcome of a payment request
   *
   * Requires `offchain:write` permission
   */
  export const subscribeToPayViaRequest: AuthenticatedLNDSubscription<SubscribeToPayViaRequestArgs>;

  export type SubscribeToPayViaRoutesArgs = {
    /** Payment Hash Hex */
    id?: string;
    /** Time to Spend Finding a Route Milliseconds */
    pathfinding_timeout?: number;
    routes: {
      /** Total Fee Tokens To Pay */
      fee: number;
      /** Total Fee Millitokens To Pay */
      fee_mtokens: string;
      hops: {
        /** Standard Format Channel Id */
        channel: string;
        /** Channel Capacity Tokens */
        channel_capacity: number;
        /** Fee */
        fee: number;
        /** Fee Millitokens */
        fee_mtokens: string;
        /** Forward Tokens */
        forward: number;
        /** Forward Millitokens */
        forward_mtokens: string;
        /** Public Key Hex */
        public_key: string;
        /** Timeout Block Height */
        timeout: number;
      }[];
      messages?: {
        /** Message Type number */
        type: string;
        /** Message Raw Value Hex Encoded */
        value: string;
      }[];
      /** Total Millitokens To Pay */
      mtokens: string;
      /** Expiration Block Height */
      timeout: number;
      /** Total Tokens To Pay */
      tokens: number;
    }[];
  };
  export type SubscribeToPayViaRoutesFailureEvent = {
    failure: [
      /** Code */
      number,
      /** Failure Message */
      string,
      {
        /** Standard Format Channel Id */
        channel: string;
        /** Millitokens */
        mtokens?: string;
        policy?: {
          /** Base Fee Millitokens */
          base_fee_mtokens: string;
          /** Locktime Delta */
          cltv_delta: number;
          /** Fees Charged in Millitokens Per Million */
          fee_rate: number;
          /** Channel is Disabled */
          is_disabled?: boolean;
          /** Maximum HLTC Millitokens value */
          max_htlc_mtokens: string;
          /** Minimum HTLC Millitokens Value */
          min_htlc_mtokens: string;
        };
        /** Public Key Hex */
        public_key: string;
        update?: {
          /** Chain Id Hex */
          chain: string;
          /** Channel Flags */
          channel_flags: number;
          /** Extra Opaque Data Hex */
          extra_opaque_data: string;
          /** Message Flags */
          message_flags: number;
          /** Channel Update Signature Hex */
          signature: string;
        };
      }
    ];
  };
  export type SubscribeToPayViaRoutesPayingEvent = {
    route: {
      /** Total Fee Tokens To Pay */
      fee: number;
      /** Total Fee Millitokens To Pay */
      fee_mtokens: string;
      hops: {
        /** Standard Format Channel Id */
        channel: string;
        /** Channel Capacity Tokens */
        channel_capacity: number;
        /** Fee */
        fee: number;
        /** Fee Millitokens */
        fee_mtokens: string;
        /** Forward Tokens */
        forward: number;
        /** Forward Millitokens */
        forward_mtokens: string;
        /** Public Key Hex */
        public_key: string;
        /** Timeout Block Height */
        timeout: number;
      }[];
      /** Total Millitokens To Pay */
      mtokens: string;
      /** Expiration Block Height */
      timeout: number;
      /** Total Tokens To Pay */
      tokens: number;
    };
  };
  export type SubscribeToPayViaRoutesRoutingFailureEvent = {
    /** Standard Format Channel Id */
    channel?: string;
    /** Failure Hop Index */
    index?: number;
    /** Failure Related Millitokens */
    mtokens?: string;
    policy?: {
      /** Base Fee Millitokens */
      base_fee_mtokens: string;
      /** Locktime Delta */
      cltv_delta: number;
      /** Fees Charged in Millitokens Per Million */
      fee_rate: number;
      /** Channel is Disabled */
      is_disabled?: boolean;
      /** Maximum HLTC Millitokens value */
      max_htlc_mtokens: string;
      /** Minimum HTLC Millitokens Value */
      min_htlc_mtokens: string;
    };
    /** Public Key Hex */
    public_key: string;
    /** Failure Reason */
    reason: string;
    route: {
      /** Total Fee Tokens To Pay */
      fee: number;
      /** Total Fee Millitokens To Pay */
      fee_mtokens: string;
      hops: {
        /** Standard Format Channel Id */
        channel: string;
        /** Channel Capacity Tokens */
        channel_capacity: number;
        /** Fee */
        fee: number;
        /** Fee Millitokens */
        fee_mtokens: string;
        /** Forward Tokens */
        forward: number;
        /** Forward Millitokens */
        forward_mtokens: string;
        /** Public Key Hex */
        public_key: string;
        /** Timeout Block Height */
        timeout: number;
      }[];
      /** Total Millitokens To Pay */
      mtokens: string;
      /** Expiration Block Height */
      timeout: number;
      /** Total Tokens To Pay */
      tokens: number;
    };
    /** Payment Forwarding Fee Rounded Up Tokens */
    safe_fee: number;
    /** Payment Tokens Rounded Up */
    safe_tokens: number;
    /** Failure Related CLTV Timeout Height */
    timeout_height?: number;
    update?: {
      /** Chain Id Hex */
      chain: string;
      /** Channel Flags */
      channel_flags: number;
      /** Extra Opaque Data Hex */
      extra_opaque_data: string;
      /** Message Flags */
      message_flags: number;
      /** Channel Update Signature Hex */
      signature: string;
    };
  };
  export type SubscribeToPayViaRoutesSuccessEvent = {
    /** Fee Paid Tokens */
    fee: number;
    /** Fee Paid Millitokens */
    fee_mtokens: string;
    hops: {
      /** Standard Format Channel Id */
      channel: string;
      /** Hop Channel Capacity Tokens */
      channel_capacity: number;
      /** Hop Forward Fee Millitokens */
      fee_mtokens: string;
      /** Hop Forwarded Millitokens */
      forward_mtokens: string;
      /** Hop CLTV Expiry Block Height */
      timeout: number;
    }[];
    /** Payment Hash Hex */
    id: string;
    /** Is Confirmed */
    is_confirmed: boolean;
    /** Is Outoing */
    is_outgoing: boolean;
    /** Total Millitokens Sent */
    mtokens: string;
    route: {
      /** Total Fee Tokens To Pay */
      fee: number;
      /** Total Fee Millitokens To Pay */
      fee_mtokens: string;
      hops: {
        /** Standard Format Channel Id */
        channel: string;
        /** Channel Capacity Tokens */
        channel_capacity: number;
        /** Fee */
        fee: number;
        /** Fee Millitokens */
        fee_mtokens: string;
        /** Forward Tokens */
        forward: number;
        /** Forward Millitokens */
        forward_mtokens: string;
        /** Public Key Hex */
        public_key: string;
        /** Timeout Block Height */
        timeout: number;
      }[];
      /** Total Millitokens To Pay */
      mtokens: string;
      /** Expiration Block Height */
      timeout: number;
      /** Total Tokens To Pay */
      tokens: number;
    };
    /** Payment Forwarding Fee Rounded Up Tokens */
    safe_fee: number;
    /** Payment Tokens Rounded Up */
    safe_tokens: number;
    /** Payment Secret Preimage Hex */
    secret: string;
    /** Total Tokens Sent */
    tokens: number;
  };
  /**
   * Subscribe to the attempts of paying via specified routes
   *
   * Requires `offchain:write` permission
   */
  export const subscribeToPayViaRoutes: AuthenticatedLNDSubscription<SubscribeToPayViaRoutesArgs>;

  export type SubscribeToPeersConnectedEvent = {
    /** Connected Peer Public Key Hex */
    public_key: string;
  };
  export type SubscribeToPeersDisconnectedEvent = {
    /** Disconnected Peer Public Key Hex */
    public_key: string;
  };
  /**
   * Subscribe to peer connectivity events
   *
   * Requires `peers:read` permission
   */
  export const subscribeToPeers: AuthenticatedLNDSubscription;

  export type SubscribeToProbeForRouteArgs = {
    /** Final CLTV Delta */
    cltv_delta?: number;
    /** Destination Public Key Hex */
    destination: string;
    features?: {
      /** Feature Bit */
      bit: number;
    }[];
    ignore?: {
      /** Public Key Hex */
      from_public_key: string;
      /** To Public Key Hex */
      to_public_key?: string;
    }[];
    /** Incoming Peer Public Key Hex */
    incoming_peer?: string;
    /** Maximum Fee Tokens */
    max_fee?: number;
    /** Maximum Fee Millitokens to Probe */
    max_fee_mtokens?: string;
    /** Maximum CLTV Timeout Height */
    max_timeout_height?: number;
    messages?: {
      /** Message To Final Destination Type number */
      type: string;
      /** Message To Final Destination Raw Value Hex Encoded */
      value: string;
    }[];
    /** Millitokens to Probe */
    mtokens?: string;
    /** Outgoing Channel Id */
    outgoing_channel?: string;
    /** Skip Individual Path Attempt After Milliseconds */
    path_timeout_ms?: number;
    /** Payment Identifier Hex */
    payment?: string;
    /** Fail Entire Probe After Milliseconds */
    probe_timeout_ms?: number;
    routes?: {
      /** Base Routing Fee In Millitokens */
      base_fee_mtokens?: number;
      /** Channel Capacity Tokens */
      channel_capacity?: number;
      /** Standard Format Channel Id */
      channel?: string;
      /** CLTV Blocks Delta */
      cltv_delta?: number;
      /** Fee Rate In Millitokens Per Million */
      fee_rate?: number;
      /** Forward Edge Public Key Hex */
      public_key: string;
    }[][];
    /** Tokens to Probe */
    tokens?: number;
    /** Total Millitokens Across Paths */
    total_mtokens?: string;
  };
  export type SubscribeToProbeForRouteErrorEvent = [
    /** Failure Code */
    number,
    /** Failure Message */
    string
  ];
  export type SubscribeToProbeForRouteProbeSuccessEvent = {
    route: {
      /** Route Confidence Score Out Of One Million */
      confidence?: number;
      /** Total Fee Tokens To Pay */
      fee: number;
      /** Total Fee Millitokens To Pay */
      fee_mtokens: string;
      hops: {
        /** Standard Format Channel Id */
        channel: string;
        /** Channel Capacity Tokens */
        channel_capacity: number;
        /** Fee */
        fee: number;
        /** Fee Millitokens */
        fee_mtokens: string;
        /** Forward Tokens */
        forward: number;
        /** Forward Millitokens */
        forward_mtokens: string;
        /** Public Key Hex */
        public_key: string;
        /** Timeout Block Height */
        timeout: number;
      }[];
      messages?: {
        /** Message Type number */
        type: string;
        /** Message Raw Value Hex Encoded */
        value: string;
      }[];
      /** Total Millitokens To Pay */
      mtokens: string;
      /** Payment Identifier Hex */
      payment?: string;
      /** Payment Forwarding Fee Rounded Up Tokens */
      safe_fee: number;
      /** Payment Sent Tokens Rounded Up */
      safe_tokens: number;
      /** Expiration Block Height */
      timeout: number;
      /** Total Tokens To Pay */
      tokens: number;
      /** Total Millitokens */
      total_mtokens?: string;
    };
  };
  export type SubscribeToProbeForRouteProbingEvent = {
    route: {
      /** Route Confidence Score Out Of One Million */
      confidence?: number;
      /** Total Fee Tokens To Pay */
      fee: number;
      /** Total Fee Millitokens To Pay */
      fee_mtokens: string;
      hops: {
        /** Standard Format Channel Id */
        channel: string;
        /** Channel Capacity Tokens */
        channel_capacity: number;
        /** Fee */
        fee: number;
        /** Fee Millitokens */
        fee_mtokens: string;
        /** Forward Tokens */
        forward: number;
        /** Forward Millitokens */
        forward_mtokens: string;
        /** Public Key Hex */
        public_key: string;
        /** Timeout Block Height */
        timeout: number;
      }[];
      messages?: {
        /** Message Type number */
        type: string;
        /** Message Raw Value Hex Encoded */
        value: string;
      }[];
      /** Total Millitokens To Pay */
      mtokens: string;
      /** Payment Identifier Hex */
      payment?: string;
      /** Payment Forwarding Fee Rounded Up Tokens */
      safe_fee: number;
      /** Payment Sent Tokens Rounded Up */
      safe_tokens: number;
      /** Expiration Block Height */
      timeout: number;
      /** Total Tokens To Pay */
      tokens: number;
      /** Total Millitokens */
      total_mtokens?: string;
    };
  };
  export type SubscribeToProbeForRouteRoutingFailureEvent = {
    /** Standard Format Channel Id */
    channel?: string;
    /** Millitokens */
    mtokens?: string;
    policy?: {
      /** Base Fee Millitokens */
      base_fee_mtokens: string;
      /** Locktime Delta */
      cltv_delta: number;
      /** Fees Charged in Millitokens Per Million */
      fee_rate: number;
      /** Channel is Disabled */
      is_disabled?: boolean;
      /** Maximum HLTC Millitokens Value */
      max_htlc_mtokens: string;
      /** Minimum HTLC Millitokens Value */
      min_htlc_mtokens: string;
    };
    /** Public Key Hex */
    public_key: string;
    /** Failure Reason */
    reason: string;
    route: {
      /** Route Confidence Score Out Of One Million */
      confidence?: number;
      /** Total Fee Tokens To Pay */
      fee: number;
      /** Total Fee Millitokens To Pay */
      fee_mtokens: string;
      hops: {
        /** Standard Format Channel Id */
        channel: string;
        /** Channel Capacity Tokens */
        channel_capacity: number;
        /** Fee */
        fee: number;
        /** Fee Millitokens */
        fee_mtokens: string;
        /** Forward Tokens */
        forward: number;
        /** Forward Millitokens */
        forward_mtokens: string;
        /** Public Key Hex */
        public_key: string;
        /** Timeout Block Height */
        timeout: number;
      }[];
      messages?: {
        /** Message Type number */
        type: string;
        /** Message Raw Value Hex Encoded */
        value: string;
      }[];
      /** Total Millitokens To Pay */
      mtokens: string;
      /** Payment Identifier Hex */
      payment?: string;
      /** Payment Forwarding Fee Rounded Up Tokens */
      safe_fee: number;
      /** Payment Sent Tokens Rounded Up */
      safe_tokens: number;
      /** Expiration Block Height */
      timeout: number;
      /** Total Tokens To Pay */
      tokens: number;
      /** Total Millitokens */
      total_mtokens?: string;
    };
    update?: {
      /** Chain Id Hex */
      chain: string;
      /** Channel Flags */
      channel_flags: number;
      /** Extra Opaque Data Hex */
      extra_opaque_data: string;
      /** Message Flags */
      message_flags: number;
      /** Channel Update Signature Hex */
      signature: string;
    };
  };
  /**
   * Subscribe to a probe attempt
   *
   * Requires `offchain:write` permission
   */
  export const subscribeToProbeForRoute: AuthenticatedLNDSubscription<SubscribeToProbeForRouteArgs>;

  export type SubscribeToTransactionsChainTransactionEvent = {
    /** Block Hash */
    block_id?: string;
    /** Confirmation Count */
    confirmation_count?: number;
    /** Confirmation Block Height */
    confirmation_height?: number;
    /** Created ISO 8601 Date */
    created_at: string;
    /** Fees Paid Tokens */
    fee?: number;
    /** Transaction Id */
    id: string;
    /** Is Confirmed */
    is_confirmed: boolean;
    /** Transaction Outbound */
    is_outgoing: boolean;
    /** Addresses */
    output_addresses: string[];
    /** Tokens Including Fee */
    tokens: number;
    /** Raw Transaction Hex */
    transaction?: string;
  };
  /**
   * Subscribe to transactions
   *
   * Requires `onchain:read` permission
   */
  export const subscribeToTransactions: AuthenticatedLNDSubscription;

  export type UnauthenticatedLNDgRPCArgs = {
    cert?: string;
    socket?: string;
  };
  export type UnauthenticatedLNDgRPCResult = {
    lnd: UnauthenticatedLND;
  };
  /**
   * Unauthenticated gRPC interface to the Lightning Network Daemon (lnd).
   *
   * Make sure to provide a cert when using LND with its default self-signed cert
   */
  export const unauthenticatedLndGrpc: (
    args: UnauthenticatedLNDgRPCArgs
  ) => UnauthenticatedLNDgRPCResult;

  export type UnlockUTXOArgs = {
    /** Lock Id Hex */
    id: string;
    /** Unspent Transaction Id Hex */
    transaction_id: string;
    /** Unspent Transaction Output Index */
    transaction_vout: number;
  };
  /**
   * Unlock UTXO
   *
   * Requires `onchain:write` permission
   *
   * Requires LND built with `walletrpc` build tag
   */
  export const unlockUtxo: AuthenticatedLNDMethod<UnlockUTXOArgs>;

  export type UnlockWalletArgs = {
    /** Wallet Password */
    password: string;
  };
  /**
   * Unlock the wallet
   */
  export const unlockWallet: UnauthenticatedLNDMethod<UnlockWalletArgs>;

  export type UpdateChainTransactionArgs = {
    /** Transaction Label */
    description: string;
    /** Transaction Id Hex */
    id: string;
  };
  /**
   * Update an on-chain transaction record metadata
   *
   * Requires LND built with `walletrpc` build tag
   *
   * Requires `onchain:write` permission
   */
  export const updateChainTransaction: AuthenticatedLNDMethod<UpdateChainTransactionArgs>;

  export type UpdateConnectedWatchtowerArgs = {
    /** Add Socket */
    add_socket?: string;
    /** Watchtower Public Key Hex */
    public_key: string;
    /** Remove Socket */
    remove_socket?: string;
  };
  /**
   * Update a watchtower
   *
   * Requires LND built with wtclientrpc build ta
   */
  export const updateConnectedWatchtower: AuthenticatedLNDMethod<UpdateConnectedWatchtowerArgs>;

  export type UpdateRoutingFeesArgs = {
    /** Base Fee Millitokens Charged */
    base_fee_mtokens?: number;
    /** Base Fee Tokens Charged */
    base_fee_tokens?: number;
    /** HTLC CLTV Delta */
    cltv_delta?: number;
    /** Fee Rate In Millitokens Per Million */
    fee_rate?: number;
    /** Maximum HTLC Millitokens to Forward */
    max_htlc_mtokens?: string;
    /** Minimum HTLC Millitokens to Forward */
    min_htlc_mtokens?: string;
    /** Channel Funding Transaction Id */
    transaction_id?: string;
    /** Channel Funding Transaction Output Index */
    transaction_vout?: number;
  };
  /**
   * Update routing fees on a single channel or on all channels
   *
   * Setting both `base_fee_tokens` and `base_fee_mtokens` is not supporte
   */
  export const updateRoutingFees: AuthenticatedLNDMethod<UpdateRoutingFeesArgs>;

  export type VerifyBackupArgs = {
    /** Individual Channel Backup Hex */
    backup: string;
  };
  export type VerifyBackupResult = {
    /** LND Error */
    err?: Object;
    /** Backup is Valid */
    is_valid: boolean;
  };
  /**
   * Verify a channel backu
   */
  export const verifyBackup: AuthenticatedLNDMethod<
    VerifyBackupArgs,
    VerifyBackupResult
  >;

  export type VerifyBackupsArgs = {
    /** Multi-Backup Hex */
    backup: string;
    channels: {
      /** Funding Transaction Id Hex */
      transaction_id: string;
      /** Funding Transaction Output Index */
      transaction_vout: number;
    }[];
  };
  export type VerifyBackupsResult = {
    /** Backup is Valid */
    is_valid: boolean;
  };
  /**
   * Verify a set of aggregated channel backup
   */
  export const verifyBackups: AuthenticatedLNDMethod<
    VerifyBackupsArgs,
    VerifyBackupsResult
  >;

  export type VerifyBytesSignatureArgs = {
    /** Message Preimage Bytes Hex Encoded */
    preimage: string;
    /** Signature Valid For Public Key Hex */
    public_key: string;
    /** Signature Hex */
    signature: string;
  };
  export type VerifyBytesSignatureResult = {
    /** Signature is Valid */
    is_valid: boolean;
  };
  /**
   * Verify signature of arbitrary bytes
   *
   * Requires LND built with `signrpc` build tag
   *
   * Requires `signer:read` permission
   */
  export const verifyBytesSignature: AuthenticatedLNDMethod<
    VerifyBytesSignatureArgs,
    VerifyBytesSignatureResult
  >;

  export type VerifyMessageArgs = {
    /** Message */
    message: string;
    /** Signature Hex */
    signature: string;
  };
  export type VerifyMessageResult = {
    /** Public Key Hex */
    signed_by: string;
  };
  /**
   * Verify a message was signed by a known pubkey
   *
   * Requires `message:read` permission
   */
  export const verifyMessage: AuthenticatedLNDMethod<
    VerifyMessageArgs,
    VerifyMessageResult
  >;
}
