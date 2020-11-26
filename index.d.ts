/**
 * TODO:
 * - errors
 * - replace unknown result types
 * - tokens number postfix
 */

declare module "ln-service" {
  export type LND = {
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
  export type LightningNetworkDaemon = LND;

  export type LNService = {
    /**
     * Initiate a gRPC API Methods Object for authenticated methods
     *
     * Both the `cert` and `macaroon` expect the entire serialized LND generated file
     *
     * See: https://github.com/alexbosworth/ln-service#authenticatedLndGrpc
     */
    authenticatedLndGrpc: (variables: {
      cert?: string;
      macaroon: string;
      socket?: string;
    }) => { lnd: LND };
  };
  export type LightningNetworkService = LNService;

  export type Args<TArgs> = {
    /** LND API Object */
    lnd: LND;
  } & TArgs;

  export type LNDMethod<TArgs, TResult = void, TError = Error> = {
    (args: Args<TArgs>): Promise<TResult>;
    (
      args: Args<TArgs>,
      callback: (error: TError, result: TResult) => void
    ): void;
  };

  export type MethodWithoutLND<TArgs, TResult = void, TError = Error> = {
    (args: TArgs): Promise<TResult>;
    (args: TArgs, callback: (error: TError, result: TResult) => void): void;
  };

  const lnService: LNService;
  export default lnService;

  export type AddPeerArgs = Args<{
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
  }>;

  /**
   * Add a peer if possible (not self, or already connected)
   *
   * Requires `peers:write` permission
   *
   * `timeout` is not supported in LND 0.11.1 and below
   */
  export const addPeer: LNDMethod<AddPeerArgs>;

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
  export const broadcastChainTransaction: LNDMethod<
    BroadcastChainTransactionArgs,
    BroadcastChainTransactionResult
  >;

  export type ChannelPolicy = {
    /** Base Fee Millitokens */
    base_fee_mtokens: string;
    /** CLTV Delta */
    cltv_delta: number;
    /** Fee Rate */
    fee_rate: number;
    /** Channel is Disabled */
    is_disabled: boolean;
    /** Maximum HTLC Millitokens */
    max_htlc_mtokens: string;
    /** Minimum HTLC Millitokens */
    min_htlc_mtokens: string;
    /** Public Key Hex */
    public_key: string;
  };

  export type Channel = {
    /** Capacity Tokens */
    capacity: number;
    /** Standard Channel Id */
    id: string;
    policies: ChannelPolicy[];
  };

  export type Hop = {
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
  };

  export type CalculateHopsArgs = {
    channels: Channel[];
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
    hops?: Hop[];
  };

  /**
   * Calculate hops between start and end nodes
   */
  export const calculateHops: LNDMethod<CalculateHopsArgs, CalculateHopsResult>;

  export type CalculatePathsArgs = {
    channels: Channel[];
    /** End Public Key Hex */
    end: string;
    /** Paths To Return Limit */
    limit?: number;
    /** Millitokens */
    mtokens: number;
    /** Start Public Key Hex */
    start: string;
  };

  export type CalculatePathsResult = { paths?: { hops: Hop[] }[] };

  /**
   * Calculate multiple routes to a destination
   */
  export const calculatePaths: LNDMethod<
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
  export const cancelHodlInvoice: LNDMethod<CancelHodlInvoiceArgs, unknown>;

  export type CancelPendingChannelArgs = {
    /** Pending Channel Id Hex */
    id: string;
  };

  /**
   * Cancel an external funding pending channel
   */
  export const cancelPendingChannel: LNDMethod<
    CancelPendingChannelArgs,
    unknown
  >;

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
  export const changePassword: LNDMethod<ChangePasswordArgs, unknown>;

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
  export const closeChannel: LNDMethod<CloseChannelArgs, CloseChannelResult>;

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
  export const connectWatchtower: LNDMethod<ConnectWatchtowerArgs, unknown>;

  export type CreateChainAddressArgs = {
    /** Receive Address Type */
    format: "np2wpkh" | "p2wpkh";
    /** Get As-Yet Unused Address */
    is_unused?: boolean;
  };

  /**
   * Create a new receive address.
   *
   * Requires address:write permission
   */
  export const createChainAddress: LNDMethod<
    CreateChainAddressArgs,
    { address: unknown }
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
  export const createHodlInvoice: LNDMethod<
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
  export const createInvoice: LNDMethod<CreateInvoiceArgs, CreateInvoiceResult>;

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
  export const createSeed: LNDMethod<CreateSeedArgs, CreateSeedResult>;

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
  export const createSignedRequest: MethodWithoutLND<
    CreateSignedRequestArgs,
    CreateSignedResult
  >;

  export type Route = {
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
  };

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
    routes?: Route[][];
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
  export const createUnsignedRequest: MethodWithoutLND<
    CreateUnsignedRequestArgs,
    CreateUnsignedRequestResult
  >;

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
  export const createWallet: LNDMethod<CreateWalletArgs, unknown>;

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
    routes: Route[][];
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
  export const decodePaymentRequest: LNDMethod<
    DecodePaymentRequestArgs,
    DecodePaymentRequestResult
  >;

  /**
   * Delete all forwarding reputations
   *
   * Requires `offchain:write` permissio
   */
  export const deleteForwardingReputations: LNDMethod<{}, unknown>;

  /**
   * Delete all records of payments
   *
   * Requires `offchain:write` permission
   */
  export const deletePayments: LNDMethod<{}, unknown>;

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
  export const diffieHellmanComputeSecret: LNDMethod<
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
  export const disconnectWatchtower: LNDMethod<
    DisconnectWatchtowerArgs,
    unknown
  >;

  export type FundPendingChannelsArgs = {
    /** Pending Channel Id Hex */
    channels: string;
    /** Signed Funding Transaction PSBT Hex */
    funding: string;
  };

  /**
   * Fund pending channels
   *
   * Requires `offchain:write`, `onchain:write` permission
   */
  export const fundPendingChannels: LNDMethod<FundPendingChannelsArgs, unknown>;

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
  export const fundPsbt: LNDMethod<FundPSBTArgs, FundPSBTResult>;
}
