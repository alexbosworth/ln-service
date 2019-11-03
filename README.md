# Lightning Network Service

[![npm version](https://badge.fury.io/js/ln-service.svg)](https://badge.fury.io/js/ln-service)

## Overview

The core of this project is a gRPC interface for node.js projects, available
through npm.

Supported LND versions:

- v0.7.1-beta
- v0.8.0-beta

## Installing LND

There is a guide to installing LND on the LND repository:
https://github.com/lightningnetwork/lnd/blob/master/docs/INSTALL.md

Example LND configuration options (~/.lnd/lnd.conf)

```ini
[Application Options]
externalip=IP
rpclisten=0.0.0.0:10009

[Bitcoin]
bitcoin.active=1
bitcoin.mainnet=1
bitcoin.node=bitcoind
```

If you are interacting with your node remotely, make sure to set (in
`[Application Options]`)

```ini
tlsextraip=YOURIP
```

If using a domain for your LND, use the domain option:

```ini
tlsextradomain=YOURDOMAIN
```

If you're adding TLS settings, regenerate the cert and key by stopping lnd,
deleting the tls.cert and tls.key - then restart lnd to regenerate.

If you're going to use extended gRPC APIs, make sure to add the APIs to make
tags.

```sh
make && make install tags="autopilotrpc chainrpc invoicesrpc routerrpc signrpc walletrpc watchtowerrpc wtclientrpc"
```

## Using gRPC

You can install ln-service service via npm

    npm install ln-service

To use authenticated methods:

Run `base64` on the tls.cert and admin.macaroon files to get the encoded
authentication data to create the LND connection. You can find these files in
the LND directory. (~/.lnd or ~/Library/Application Support/Lnd)

    base64 tls.cert
    base64 data/chain/bitcoin/mainnet/admin.macaroon

Be careful to avoid copying any newline characters in creds. To exclude them:

    base64 ~/.lnd/tls.cert | tr -d '\n'
    base64 ~/.lnd/data/chain/bitcoin/mainnet/admin.macaroon | tr -d '\n'

You can then use these to interact with your LND node directly:

```node
const lnService = require('ln-service');

const {lnd} = lnService.authenticatedLndGrpc({
  cert: 'base64 encoded tls.cert',
  macaroon: 'base64 encoded admin.macaroon',
  socket: '127.0.0.1:10009',
});

// Callback syntax
lnService.getWalletInfo({lnd}, (err, result) => {
  const nodeKey = result.public_key;
});

// Promise syntax
const nodePublicKey = (await lnService.getWalletInfo({lnd})).public_key;
```

An [unauthenticatedLndGrpc](#unauthenticatedLndGrpc) function is also available
for `unlocker` methods.

## All Methods

- [addPeer](#addPeer) - Connect to a peer
- [authenticatedLndGrpc](#authenticatedLndGrpc) - LND API Object
- [broadcastChainTransaction](#broadcastChainTransaction) - Push a chain tx
- [calculateHops](#calculateHops) - Pathfind to get payment hops from channels
- [calculatePaths](#calculatePaths) - Pathfind to find multiple routes to pay
- [cancelHodlInvoice](#cancelHodlInvoice) - Cancel a held or open invoice
- [changePassword](#changePassword) - Change the wallet unlock password
- [closeChannel](#closeChannel) - Terminate an open channel
- [connectWatchtower](#connectWatchtower) - Connect a watchtower
- [createChainAddress](#createChainAddress) - Get a chain address to receive at
- [createHodlInvoice](#createHodlInvoice) - Make a HODL HTLC invoice
- [createInvoice](#createInvoice) - Make a regular invoice
- [createSeed](#createSeed) - Generate a wallet seed for a new wallet
- [createWallet](#createWallet) - Make a new wallet
- [decodePaymentRequest](#decodePaymentRequest) - Decode a Lightning invoice
- [deleteForwardingReputations](#deleteForwardingReputations) - Wipe node reps
- [deletePayments](#deletePayments) - Delete entire history of past payments
- [disconnectWatchtower](#disconnectWatchtower) - Disconnect a watchtower
- [getAutopilot](#getAutopilot) - Get autopilot status or node scores
- [getBackup](#getBackup) - Get a backup of a channel
- [getBackups](#getBackups) - Get a backup for all channels
- [getChainBalance](#getChainBalance) - Get the confirmed chain balance
- [getChainFeeEstimate](#getChainFeeEstimate) - Get a chain fee estimate
- [getChainFeeRate](#getChainFeeRate) - Get the fee rate for a conf target
- [getChainTransactions](#getChainTransactions) - Get all chain transactions
- [getChannel](#getChannel) - Get graph information about a channel
- [getChannelBalance](#getChannelBalance) - Get the balance of channel funds
- [getChannels](#getChannels) - Get all open channels
- [getClosedChannels](#getClosedChannels) - Get previously open channels
- [getConnectedWatchtowers](#getConnectedWatchtowers) - Get connected towers
- [getFeeRates](#getFeeRates) - Get current routing fee rates
- [getForwardingConfidence](#getForwardingConfidence) - Get pairwise confidence
- [getForwardingReputations](#getForwardingReputations) - Get graph reputations
- [getForwards](#getForwards) - Get forwarded routed payments
- [getInvoice](#getInvoice) - Get a previously created invoice
- [getInvoices](#getInvoices) - Get all previously created invoice
- [getNetworkGraph](#getNetworkGraph) - Get the channels and nodes of the graph
- [getNetworkInfo](#getNetworkInfo) - Get high-level graph info
- [getNode](#getNode) - Get graph info about a single node and its channels
- [getPayment](#getPayment) - Get a past payment
- [getPayments](#getPayments) - Get all past payments
- [getPeers](#getPeers) - Get all connected peers
- [getPendingChainBalance](#getPendingChainBalance) - Get pending chain balance
- [getPendingChannels](#getPendingChannels) - Get channels in pending states
- [getPublicKey](#getPublicKey) - Get a public key out of the seed
- [getRouteConfidence](#getRouteConfidence) - Get confidence in a route
- [getRouteThroughHops](#getRouteThroughHops) - Get a route through ndoes
- [getRoutes](#getRoutes) - Find payable routes to a target destination
- [getTowerServerInfo](#getTowerServerInfo) - Get information about tower server
- [getUtxos](#getUtxos) - Get on-chain unspent outputs
- [getWalletInfo](#getWalletInfo) - Get general wallet info
- [grantAccess](#grantAccess) - Grant an access credential macaroon
- [isDestinationPayable](#isDestinationPayable) - Check can pay to destination
- [openChannel](#openChannel) - Open a new channel
- [parsePaymentRequest](#parsePaymentRequest) - Parse a BOLT11 Payment Request
- [pay](#pay) - Send a payment
- [payViaPaymentDetails](#payViaPaymentDetails) - Pay using decomposed details
- [payViaPaymentRequest](#payViaPaymentRequest) - Pay using a payment request
- [payViaRoutes](#payViaRoutes) - Make a payment over specified routes
- [probe](#probe) - Find a payable route by attempting a fake payment
- [probeForRoute](#probeForRoute) - Actively probe to find a payable route
- [recoverFundsFromChannel](#recoverFundsFromChannel) - Restore a channel
- [recoverFundsFromChannels](#recoverFundsFromChannels) - Restore all channels
- [removePeer](#removePeer) - Disconnect from a connected peer
- [routeFromChannels](#routeFromChannels) - Convert channel series to a route
- [sendToChainAddress](#sendToChainAddress) - Send on-chain to an address
- [sendToChainAddresses](#sendToChainAddresses) - Send on-chain to addresses
- [setAutopilot](#setAutopilot) - Turn autopilot on and set autopilot scores
- [settleHodlInvoice](#settleHodlInvoice) - Accept a HODL HTLC invoice
- [signMessage](#signMessage) - Sign a message with the node identity key
- [signTransaction](#signTransaction) - Sign an on-chain transaction
- [stopDaemon](#stopDaemon) - Stop lnd
- [subscribeToBackups](#subscribeToBackups) - Subscribe to channel backups
- [subscribeToBlocks](#subscribeToBlocks) - Subscribe to on-chain blocks
- [subscribeToChainAddress](#subscribeToChainAddress) - Subscribe to receives
- [subscribeToChainSpend](#subscribeToChainSpend) - Subscribe to chain spends
- [subscribeToChannels](#subscribeToChannels) - Subscribe to channel statuses
- [subscribeToGraph](#subscribeToGraph) - Subscribe to network graph updates
- [subscribeToInvoice](#subscribeToInvoice) - Subscribe to invoice updates
- [subscribeToInvoices](#subscribeToInvoices) - Subscribe to all invoices
- [subscribeToOpenRequests](#subscribeToOpenRequests) - Approve open requests
- [subscribeToPastPayment](#subscribeToPastPayment) - Subscribe to a payment
- [subscribeToPayViaDetails](#subscribeToPayViaDetails) - Pay using details
- [subscribeToPayViaRequest](#subscribeToPayViaRequest) - Pay using a request
- [subscribeToPayViaRoutes](#subscribeToPayViaRoutes) - Pay using routes
- [subscribeToProbe](#subscribeToProbe) - Subscribe to a probe for a route
- [subscribeToTransactions](#subscribeToTransactions) - Subscribe to chain tx
- [unauthenticatedLndGrpc](#unauthenticatedLndGrpc) - LND for locked lnd APIs
- [unlockWallet](#unlockWallet) - Unlock a locked lnd
- [updateConnectedWatchtower](#updateConnectedWatchtower) - Update watchtower
- [updateRoutingFees](#updateRoutingFees) - Change routing fees
- [verifyBackup](#verifyBackup) - Verify a channel backup
- [verifyBackups](#verifyBackups) - Verify a set of channel backups
- [verifyMessage](#verifyMessage) - Verify a message signed by a node identity

## Additional Libraries

- [bolt03](https://npmjs.com/package/bolt03) - bolt03 tx utilities
- [bolt07](https://npmjs.com/package/bolt07) - bolt07 channel id utilities
- [ln-accounting](https://npmjs.com/package/ln-accounting) - accounting records

### addPeer

Add a peer if possible (not self, or already connected)

    {
      [is_temporary]: <Add Peer as Temporary Peer Bool> // Default: false
      lnd: <Authenticated LND gRPC API Object>
      public_key: <Public Key Hex String>
      [retry_count]: <Retry Count Number>
      socket: <Host Network Address And Optional Port String> // ip:port
    }

    @returns via cbk or Promise

Example:

```node
const {addPeer} = require('ln-service');
const socket = hostIp + ':' + portNumber;
await addPeer({lnd, socket, public_key: publicKeyHexString});
```

### authenticatedLndGrpc

Initiate an gRPC API Methods Object for authenticated methods.

    {
      [cert]: <Base64 or Hex Serialized LND TLS Cert>
      macaroon: <Base64 or Hex Serialized Macaroon String>
      [socket]: <Host:Port String>
    }

    @throws
    <Error>

    @returns
    {
      lnd: {
        autopilot: <Autopilot gRPC Methods Object>
        chain: <ChainNotifier gRPC Methods Object>
        default: <Default gRPC Methods Object>
        invoices: <Invoices gRPC Methods Object>
        router: <Router gRPC Methods Object>
        signer: <Signer gRPC Methods Object>
        wallet: <WalletKit gRPC Methods Object>
      }
    }

Example:

```node
const lnService = require('ln-service');
const {lnd} = lnService.authenticatedLndGrpc({
  cert: 'base64 encoded tls.cert',
  macaroon: 'base64 encoded admin.macaroon',
  socket: '127.0.0.1:10009',
});
const wallet = await lnService.getWalletInfo({lnd});
```

### broadcastChainTransaction

Publish a raw blockchain transaction to Blockchain network peers

Requires lnd built with `walletrpc` tag

    {
      lnd: <Authenticated LND gRPC API Object>
      transaction: <Transaction Hex String>
    }

    @returns via cbk or Promise
    {
      id: <Transaction Id Hex String>
    }

Example:

```node
const {broadcastChainTransaction} = require('ln-service');
const transaction = hexEncodedTransactionString;

// Broadcast transaction to the p2p network
const {id} = await broadcastChainTransaction({lnd, transaction});
```

### calculateHops

Calculate hops between start and end nodes

    {
      channels: [{
        capacity: <Capacity Tokens Number>
        id: <Standard Channel Id String>
        policies: [{
          base_fee_mtokens: <Base Fee Millitokens String>
          cltv_delta: <CLTV Delta Number>
          fee_rate: <Fee Rate Number>
          is_disabled: <Channel is Disabled Bool>
          max_htlc_mtokens: <Maximum HTLC Millitokens String>
          min_htlc_mtokens: <Minimum HTLC Millitokens String>
          public_key: <Public Key Hex String>
        }]
      }]
      end: <End Public Key Hex String>
      [ignore]: [{
        [channel]: <Standard Format Channel Id String>
        public_key: <Public Key Hex String>
      }]
      mtokens: <Millitokens Number>
      start: <Start Public Key Hex String>
    }

    @throws
    <Error>

    @returns
    {
      [hops]: [{
        base_fee_mtokens: <Base Fee Millitokens String>
        channel: <Standard Channel Id String>
        channel_capacity: <Channel Capacity Tokens Number>
        cltv_delta: <CLTV Delta Number>
        fee_rate: <Fee Rate Number>
        public_key: <Public Key Hex String>
      }]
    }

Example:

```node
const {calculateHops, getNetworkGraph, getWalletInfo} = require('ln-service');
const {channels} = await getNetworkGraph;
const end = 'destinationPublicKeyHexString';
const start = (await getWalletInfo({lnd})).public_key;_
const const {hops} = calculateHops({channels, end, start, mtokens: '1000'});
```

### calculatePaths

Calculate multiple routes to a destination

    {
      channels: [{
        capacity: <Capacity Tokens Number>
        id: <Standard Channel Id String>
        policies: [{
          base_fee_mtokens: <Base Fee Millitokens String>
          cltv_delta: <CLTV Delta Number>
          fee_rate: <Fee Rate Number>
          is_disabled: <Channel is Disabled Bool>
          max_htlc_mtokens: <Maximum HTLC Millitokens String>
          min_htlc_mtokens: <Minimum HTLC Millitokens String>
          public_key: <Public Key Hex String>
        }]
      }]
      end: <End Public Key Hex String>
      [limit]: <Paths To Return Limit Number>
      mtokens: <Millitokens Number>
      start: <Start Public Key Hex String>
    }

    @throws
    <Error>

    @returns
    {
      [paths]: [{
        hops: [{
          base_fee_mtokens: <Base Fee Millitokens String>
          channel: <Standard Channel Id String>
          channel_capacity: <Channel Capacity Tokens Number>
          cltv_delta: <CLTV Delta Number>
          fee_rate: <Fee Rate Number>
          public_key: <Public Key Hex String>
        }]
      }]
    }

Example:

```node
const {calculatePaths, getNetworkGraph, getWalletInfo} = require('ln-service');
const {channels} = await getNetworkGraph;
const end = 'destinationPublicKeyHexString';
const start = (await getWalletInfo({lnd})).public_key;
const const {paths} = calculatePaths({channels, end, start, mtokens: '1000'});
```

### cancelHodlInvoice

Cancel an invoice

Requires lnd built with invoicesrpc

    {
      id: <Payment Preimage Hash Hex String>
      lnd: <Authenticated RPC LND gRPC API Object>
    }

    @returns via cbk or Promise

Example:

```node
const {cancelHodlInvoice} = require('ln-service');
const id = paymentRequestPreimageHashHexString;
const await cancelHodlInvoice({id, lnd});
```

### changePassword

Change password

Requires locked LND and unauthenticated LND gRPC connection

    {
      current_password: <Current Password String>
      lnd: <Unauthenticated LND gRPC API Object>
      new_password: <New Password String>
    }

    @returns via cbk or Promise

Example:

```node
const {changePassword} = require('ln-service');
await changePassword({lnd, current_password: pass, new_password: newPass});
```

### closeChannel

Close a channel.

Either an id or a transaction id / transaction output index is required

If cooperatively closing, pass a public key and socket to connect

    {
      [id]: <Standard Format Channel Id String>
      [is_force_close]: <Is Force Close Bool>
      lnd: <Authenticated LND gRPC API Object>
      [public_key]: <Peer Public Key String>
      [socket]: <Peer Socket String>
      [target_confirmations]: <Confirmation Target Number>
      [tokens_per_vbyte]: <Tokens Per Virtual Byte Number>
      [transaction_id]: <Transaction Id Hex String>
      [transaction_vout]: <Transaction Output Index Number>
    }

    @returns via cbk or Promise
    {
      transaction_id: <Closing Transaction Id Hex String>
      transaction_vout: <Closing Transaction Vout Number>
    }

Example:

```node
const {closeChannel} = require('ln-service');
const closing = await closeChannel({id, lnd});
```

### connectWatchtower

Connect to a watchtower

This method requires LND built with wtclientrpc build tag

    {
      lnd: <Authenticated LND gRPC API Object>
      public_key: <Watchtower Public Key Hex String>
      socket: <Network Socket Address IP:PORT String>
    }

    @returns via cbk or Promise

Example:

```node
const {connectWatchtower, getTowerServerInfo} = require('ln-service');

const {tower} = await getTowerServerInfo({lnd: towerServerLnd});

await connectWatchtower({lnd, public_key: tower.public_key, socket: tower.socket});
```

### createChainAddress

Create a new receive address.

    {
      format: <Receive Address Type String> // "np2wpkh" || "p2wpkh"
      [is_unused]: <Get As-Yet Unused Address Bool>
      lnd: <Authenticated LND gRPC API Object>
    }

    @returns via cbk or Promise
    {
      address: <Chain Address String>
    }

Example:

```node
const {createChainAddress} = require('ln-service');
const format = 'p2wpkh';
const {address} = await createChainAddress({format, lnd});
```

### createHodlInvoice

Create hodl invoice. This invoice will not settle automatically when an HTLC
arrives. It must be settled separately with a preimage.

Requires lnd built with invoicesrpc tag

    {
      [cltv_delta]: <Final CLTV Delta Number>
      [description]: <Invoice Description String>
      [expires_at]: <Expires At ISO 8601 Date String>
      id: <Payment Hash Hex String>
      [internal_description]: <Internal Description String>
      [is_fallback_included]: <Is Fallback Address Included Bool>
      [is_fallback_nested]: <Is Fallback Address Nested Bool>
      [is_including_private_channels]: <Invoice Includes Private Channels Bool>
      lnd: <Authenticated LND gRPC API Object>
      [log]: <Log Function> // Required when WSS is passed
      [tokens]: <Tokens Number>
      [wss]: [<Web Socket Server Object>]
    }

    @returns via cbk or Promise
    {
      [chain_address]: <Backup Address String>
      created_at: <ISO 8601 Date String>
      description: <Description String>
      id: <Payment Hash Hex String>
      request: <BOLT 11 Encoded Payment Request String>
      secret: <Hex Encoded Payment Secret String>
      tokens: <Tokens Number>
    }

Example:

```node
const {createHodlInvoice} = require('ln-service');
const id = 'preimageSha256HashString';
const invoice = await createHodlInvoice({id, lnd});
```

### createInvoice

Create a Lightning invoice.

    {
      [cltv_delta]: <CLTV Delta Number>
      [description]: <Invoice Description String>
      [expires_at]: <Expires At ISO 8601 Date String>
      [is_fallback_included]: <Is Fallback Address Included Bool>
      [is_fallback_nested]: <Is Fallback Address Nested Bool>
      [is_including_private_channels]: <Invoice Includes Private Channels Bool>
      lnd: <Authenticated LND gRPC API Object>
      [log]: <Log Function> // Required when WSS is passed
      [secret]: <Payment Secret Hex String>
      [tokens]: <Tokens Number>
      [wss]: [<Web Socket Server Object>]
    }

    @returns via cbk or Promise
    {
      [chain_address]: <Backup Address String>
      created_at: <ISO 8601 Date String>
      description: <Description String>
      id: <Payment Hash Hex String>
      request: <BOLT 11 Encoded Payment Request String>
      secret: <Hex Encoded Payment Secret String>
      tokens: <Tokens Number>
    }

Example:

```node
const {createInvoice} = require('ln-service');
const invoice = await createInvoice({lnd});
```

### createSeed

Create a wallet seed

Requires unlocked lnd and unauthenticated LND gRPC API Object

    {
      lnd: <Unauthenticed LND gRPC API Object>
      [passphrase]: <Seed Passphrase String>
    }

    @returns via cbk or Promise
    {
      seed: <Cipher Seed Mnemonic String>
    }

Example:

```node
const {createSeed} = require('ln-service');
const {seed} = await createSeed({lnd});
```

### createWallet

Create a wallet

Requires unlocked lnd and unauthenticated LND gRPC API Object

    {
      lnd: <Unauthenticated LND gRPC API Object>
      [passphrase]: <AEZSeed Encryption Passphrase String>
      password: <Wallet Password String>
      seed: <Seed Mnemonic String>
    }

    @returns via cbk or Promise

Example:

```node
const {createWallet} = require('ln-service');
const {seed} = await createSeed({lnd});
await createWallet({lnd, seed, password: 'password'});
```

### decodePaymentRequest

Get decoded payment request

    {
      lnd: <Authenticated LND gRPC API Object>
      request: <BOLT 11 Payment Request String>
    }

    @returns via cbk or Promise
    {
      chain_address: <Fallback Chain Address String>
      [cltv_delta]: <Final CLTV Delta Number>
      description: <Payment Description String>
      description_hash: <Payment Longer Description Hash String>
      destination: <Public Key String>
      expires_at: <ISO 8601 Date String>
      id: <Payment Hash String>
      routes: [[{
        [base_fee_mtokens]: <Base Routing Fee In Millitokens String>
        [channel]: <Standard Format Channel Id String>
        [cltv_delta]: <CLTV Blocks Delta Number>
        [fee_rate]: <Fee Rate In Millitokens Per Million Number>
        public_key: <Forward Edge Public Key Hex String>
      }]]
      tokens: <Requested Tokens Number>
    }

Example:

```node
const {decodePaymentRequest} = require('ln-service');
const request = 'bolt11EncodedPaymentRequestString';
const details = await decodePaymentRequest({lnd, request});
```

### deleteForwardingReputations

Delete all forwarding reputations

Requires LND built with routerrpc build tag

    {
      lnd: <Authenticated gRPC LND API Object>
    }

    @returns via cbk or Promise

Example:

```node
const {deleteForwardingReputations} = require('ln-service');
await deleteForwardingReputations({});
```

### deletePayments

Delete all records of payments

    {
      lnd: <Authenticated LND gRPC API Object>
    }

    @returns via cbk or Promise

Example:
```node
const {deletePayments} = require('ln-service');
await deletePayments({lnd});
```

### disconnectWatchtower

Disconnect a watchtower

Requires LND built with wtclientrpc build tag

    {
      lnd: <Authenticated LND gRPC API Object>
      public_key: <Watchtower Public Key Hex String>
    }

    @returns via cbk or Promise

```node
const {disconnectWatchtower, getConnectedWatchtowers} = require('ln-service');

const [tower] = (await getConnectedWatchtowers({lnd})).towers;

await disconnectWatchtower({lnd, public_key: tower.public_key});
```

### getAutopilot

Get Autopilot status

Optionally, get the score of nodes as considered by the autopilot.
Local scores reflect an internal scoring that includes local channel info

    {
      lnd: <Authenticated LND gRPC Object>
      [node_scores]: [<Get Score For Public Key Hex String>]
    }

    @returns via cbk or Promise
    {
      is_enabled: <Autopilot is Enabled Bool>
      nodes: [{
        local_preferential_score: <Local-adjusted Pref Attachment Score Number>
        local_score: <Local-adjusted Externally Set Score Number>
        preferential_score: <Preferential Attachment Score Number>
        public_key: <Node Public Key Hex String>
        score: <Externally Set Score Number>
        weighted_local_score: <Combined Weighted Locally-Adjusted Score Number>
        weighted_score: <Combined Weighted Score Number>
      }]
    }

Example:

```node
const {getAutopilot} = require('ln-service');
const isAutopilotEnabled = (await getAutopilot({lnd})).is_enabled;
```

### getBackup

Get the static channel backup for a channel

    {
      lnd: <Authenticated LND gRPC API Object>
      transaction_id: <Funding Transaction Id Hex String>
      transaction_vout: <Funding Transaction Output Index Number>
    }

    @returns via cbk or Promise
    {
      backup: <Channel Backup Hex String>
    }

Example:

```node
const {getBackup, getChannels} = require('ln-service');
const [channel] = (await getChannels({lnd})).channels;
const {backup} = await getBackup({
  lnd,
  transaction_id: channel.transaction_id,
  transaction_vout: channel.transaction_vout,
});
```

### getBackups

Get all channel backups

    {
      lnd: <Authenticated LND gRPC API Object>
    }

    @returns via cbk or Promise
    {
      backup: <All Channels Backup Hex String>
      channels: {
        backup: <Individualized Channel Backup Hex String>
        transaction_id: <Channel Funding Transaction Id Hex String>
        transaction_vout: <Channel Funding Transaction Output Index Number>
      }
    }

Example:

```node
const {getBackups} = require('ln-service');
const {backup} = await getBackups({lnd});
```

### getChainBalance

Get balance on the chain.

    {
      lnd: <Authenticated LND gRPC API Object>
    }

    @returns via cbk or Promise
    {
      chain_balance: <Confirmed Chain Balance Tokens Number>
    }

Example:

```node
const {getChainBalance} = require('ln-service');
const chainBalance = (await getChainBalance({lnd})).chain_balance;
```

### getChainFeeEstimate

Get a chain fee estimate for a prospective chain send

    {
      lnd: <Authenticated LND gRPC API Object>
      send_to: [{
        address: <Address String>
        tokens: <Tokens Number>
      }]
      [target_confirmations]: <Target Confirmations Number>
    }

    @returns via cbk or Promise
    {
      fee: <Total Fee Tokens Number>
      tokens_per_vbyte: <Fee Tokens Per VByte Number>
    }

Example:

```node
const {getChainFeeEstimate} = require('ln-service');
const sendTo = [{address: 'chainAddressString', tokens: 100000000}];
const {fee} = await getChainTransactions({lnd, send_to: sendTo});
```

### getChainFeeRate

Get chain fee rate estimate

Requires lnd built with `walletrpc` tag

    {
      [confirmation_target]: <Future Blocks Confirmation Number>
      lnd: <Authenticated LND gRPC API Object>
    }

    @returns via cbk or Promise
    {
      tokens_per_vbyte: <Tokens Per Virtual Byte Number>
    }

Example:

```node
const {getChainFeeRate} = require('ln-service');
const fee = (await getChainFeeRate({lnd, confirmation_target: 6})).tokens_per_vbyte;
```

### getChainTransactions

Get chain transactions.

    {
      lnd: <Authenticated LND gRPC Object>
    }

    @returns via cbk or Promise
    {
      transactions: [{
        [block_id]: <Block Hash String>
        [confirmation_count]: <Confirmation Count Number>
        [confirmation_height]: <Confirmation Block Height Number>
        created_at: <Created ISO 8601 Date String>
        [fee]: <Fees Paid Tokens Number>
        id: <Transaction Id String>
        output_addresses: [<Address String>]
        tokens: <Tokens Including Fee Number>
      }]
    }

Example:

```node
const {getChainTransactions} = require('ln-service');
const {transactions} = await getChainTransactions({lnd});
```

### getChannelBalance

Get balance across channels.

    {
      lnd: <Authenticated LND gRPC API Object>
    }

    @returns via cbk or Promise
    {
      channel_balance: <Channels Balance Tokens Number>
      pending_balance: <Pending Channels Balance Tokens Number>
    }

Example:

```node
const {getChannelBalance} = require('ln-service');
const balanceInChannels = (await getChannelBalance({lnd})).channel_balance;
```

### getChannel

Get graph information about a channel on the network

    {
      id: <Standard Format Channel Id String>
      lnd: <Authenticated LND gRPC API Object>
    }

    @returns via cbk or Promise
    {
      capacity: <Maximum Tokens Number>
      id: <Standard Format Channel Id String>
      policies: [{
        [base_fee_mtokens]: <Base Fee Millitokens String>
        [cltv_delta]: <Locktime Delta Number>
        [fee_rate]: <Fees Charged Per Million Tokens Number>
        [is_disabled]: <Channel Is Disabled Bool>
        [max_htlc_mtokens]: <Maximum HTLC Millitokens Value String>
        [min_htlc_mtokens]: <Minimum HTLC Millitokens Value String>
        public_key: <Node Public Key String>
        [updated_at]: <Policy Last Updated At ISO 8601 Date String>
      }]
      transaction_id: <Transaction Id Hex String>
      transaction_vout: <Transaction Output Index Number>
      [updated_at]: <Last Update Epoch ISO 8601 Date String>
    }

Example:

```node
const {getChannel} = await require('ln-service');
const id = '0x0x0';
const channelDetails = await getChannel({id, lnd});
```

### getChannels

Get channels

`is_static_remote_key` will be undefined on LND 0.7.1 and below

`time_offline` and `time_online` will be undefined on 0.8.0 and below

    {
      [is_active]: <Limit Results To Only Active Channels Bool> // false
      [is_offline]: <Limit Results To Only Offline Channels Bool> // false
      [is_private]: <Limit Results To Only Private Channels Bool> // false
      [is_public]: <Limit Results To Only Public Channels Bool> // false
      lnd: <Authenticated LND gRPC API Object>
    }

    @returns via cbk or Promise
    {
      channels: [{
        capacity: <Channel Token Capacity Number>
        commit_transaction_fee: <Commit Transaction Fee Number>
        commit_transaction_weight: <Commit Transaction Weight Number>
        id: <Standard Format Channel Id String>
        is_active: <Channel Active Bool>
        is_closing: <Channel Is Closing Bool>
        is_opening: <Channel Is Opening Bool>
        is_partner_initiated: <Channel Partner Opened Channel Bool>
        is_private: <Channel Is Private Bool>
        [is_static_remote_key]: <Remote Key Is Static Bool>
        local_balance: <Local Balance Tokens Number>
        local_reserve: <Local Reserved Tokens Number>
        partner_public_key: <Channel Partner Public Key String>
        pending_payments: [{
          id: <Payment Preimage Hash Hex String>
          is_outgoing: <Payment Is Outgoing Bool>
          timeout: <Chain Height Expiration Number>
          tokens: <Payment Tokens Number>
        }]
        received: <Received Tokens Number>
        remote_balance: <Remote Balance Tokens Number>
        remote_reserve: <Remote Reserved Tokens Number>
        sent: <Sent Tokens Number>
        [time_offline]: <Monitoring Uptime Channel Down Milliseconds Number>
        [time_online]: <Monitoring Uptime Channel Up Milliseconds Number>
        transaction_id: <Blockchain Transaction Id String>
        transaction_vout: <Blockchain Transaction Vout Number>
        unsettled_balance: <Unsettled Balance Tokens Number>
      }]
    }

Example:

```node
const {getChannels} = require('ln-service');

// Get the channels and count how many there are
const channelsCount = (await getChannels({lnd})).length;
```

### getClosedChannels

Get closed out channels

Multiple close type flags are supported.

    {
      [is_breach_close]: <Only Return Breach Close Channels Bool>
      [is_cooperative_close]: <Only Return Cooperative Close Channels Bool>
      [is_funding_cancel]: <Only Return Funding Canceled Channels Bool>
      [is_local_force_close]: <Only Return Local Force Close Channels Bool>
      [is_remote_force_close]: <Only Return Remote Force Close Channels Bool>
      lnd: <Authenticated LND gRPC API Object>
    }

    @returns via cbk or Promise
    {
      channels: [{
        capacity: <Closed Channel Capacity Tokens Number>
        [close_confirm_height]: <Channel Close Confirmation Height Number>
        [close_transaction_id]: <Closing Transaction Id Hex String>
        final_local_balance: <Channel Close Final Local Balance Tokens Number>
        final_time_locked_balance: <Closed Channel Timelocked Tokens Number>
        [id]: <Closed Standard Format Channel Id String>
        is_breach_close: <Is Breach Close Bool>
        is_cooperative_close: <Is Cooperative Close Bool>
        is_funding_cancel: <Is Funding Cancelled Close Bool>
        is_local_force_close: <Is Local Force Close Bool>
        is_remote_force_close: <Is Remote Force Close Bool>
        partner_public_key: <Partner Public Key Hex String>
        transaction_id: <Channel Funding Transaction Id Hex String>
        transaction_vout: <Channel Funding Output Index Number>
      }]
    }

Example:

```node
const {getClosedChannels} = require('ln-service');
const breachCount = await getClosedChannels({lnd, is_breach_close: true});
```

### getConnectedWatchtowers

Get a list of connected watchtowers and watchtower info

Requires LND built with wtclientrpc build tag

Includes previously connected watchtowers

    {
      lnd: <Authenticated LND gRPC API Object>
    }

    @returns via cbk or Promise
    {
      max_session_update_count: <Maximum Updates Per Session Number>
      sweep_tokens_per_vbyte: <Sweep Tokens per Virtual Byte Number>
      backups_count: <Total Backups Made Count Number>
      failed_backups_count: <Total Backup Failures Count Number>
      finished_sessions_count: <Finished Updated Sessions Count Number>
      pending_backups_count: <As Yet Unacknowledged Backup Requests Count Number>
      sessions_count: <Total Backup Sessions Starts Count Number>
      towers: [{
        is_active: <Tower Can Be Used For New Sessions Bool>
        public_key: <Identity Public Key Hex String>
        sessions: [{
          backups_count: <Total Successful Backups Made Count Number>
          max_backups_count: <Backups Limit Number>
          pending_backups_count: <Backups Pending Acknowledgement Count Number>
          sweep_tokens_per_vbyte: <Fee Rate in Tokens Per Virtual Byte Number>
        }]
        sockets: [<Tower Network Address IP:Port String>]
      }]
    }

Example:

```node
const {getConnectedWatchtowers} = require('ln-service');

const {towers} = (await getConnectedWatchtowers({lnd}));
```

### getFeeRates

Get a rundown on fees for channels

    {
      lnd: <Authenticated LND gRPC API Object>
    }

    @returns via cbk or Promise
    {
      channels: [{
        base_fee: <Base Flat Fee in Tokens Number>
        fee_rate: <Fee Rate In Tokens Per Million Number>
        transaction_id: <Channel Funding Transaction Id Hex String>
        transaction_vout: <Funding Outpoint Output Index Number>
      }]
    }

Example:

```node
const {getFeeRates} = require('ln-service');
const {channels} = await getFeeRates({lnd});
```

### getForwardingConfidence

Get the confidence in being able to send between a direct pair of nodes

Requires LND built with `routerrpc` build tag

Note: this method is not supported in LND 0.8.0 and below.

    {
      from: <From Public Key Hex String>
      lnd: <Authenticated LND gRPC API Object>
      mtokens: <Millitokens To Send String>
      to: <To Public Key Hex String>
    }

    @returns via cbk or Promise
    {
      confidence: <Success Confidence Score Out Of One Million Number>
      [past_failure_at]: <Past Failure At ISO 8601 Date String>
      [past_failure_tokens]: <Smallest Tokens That Historically Failed Number>
      [past_success_at]: <Past Success At ISO 8601 Date String>
    }

Example:

```node
const {getForwardingConfidence} = require('ln-service');
const from = nodeAPublicKey;
const mtokens = '10000';
const to = nodeBPublicKey;

// Given two nodes, get confidence score out of 1,000,000 in forwarding success
const {confidence} = await getForwardingConfidence({from, lnd, mtokens, to});
```

### getForwardingReputations

Get the set of forwarding reputations

Requires LND built with `routerrpc` build tag

Note: In LND v0.7.1 channels reputations are returned.
Note: In LND v0.8.0 peers reputations are returned.
Note: after LND v0.8.0 confidence is not returned per peer.

    {
      [confidence]: <Ignore Confidence Higher than N out of 1 Million Number>
      lnd: <Authenticated LND gRPC API Object>
      [tokens]: <Reputation Against Forwarding Tokens Number>
    }

    @returns via cbk or Promise
    {
      nodes: [{
        channels: [{
          confidence: <Forwarding Confidence Out of 1 Million Number>
          id: <Standard Format Channel Id String>
          last_failed_forward_at: <Last Failed Forward Time ISO-8601 Date String>
          min_relevant_tokens: <Minimum Token Amount to Use This Estimate Number>
          [to_public_key]: <To Public Key Hex String>
        }]
        [confidence]: <Non-Channel-Specific Confidence Number>
        [last_failed_forward_at]: <Last Failed Forward Time ISO-8601 Date String>
        peers: [{
          [confidence]: <Forwarding Confidence Out of One Million Number>
          last_failed_forward_at: <Last Failed Forward Time ISO-8601 Date String>
          min_relevant_tokens: <Minimum Token Amount to Use This Estimate Number>
          to_public_key: <To Public Key Hex String>
        }]
        public_key: <Node Identity Public Key Hex String>
      }]
    }

```node
const {getForwardingReputations} = require('ln-service');
const {nodes} = await getForwardingReputations({lnd});
```

### getForwards

Get forwarded payments, from oldest to newest

When using an "after" date a "before" date is required.

If a next token is returned, pass it to get additional page of results.

`mtokens` is not supported on LND v0.8.0 or lower

    {
      [after]: <Get Only Payments Forwarded At Or After ISO 8601 Date String>
      [before]: <Get Only Payments Forwarded Before ISO 8601 Date String>
      [limit]: <Page Result Limit Number>
      lnd: <Authenticated LND gRPC API Object>
      [token]: <Opaque Paging Token String>
    }

    @returns via cbk or Promise
    {
      forwards: [{
        created_at: <Forward Record Created At ISO 8601 Date String>
        fee: <Fee Tokens Charged Number>
        fee_mtokens: <Approximated Fee Millitokens Charged String>
        incoming_channel: <Incoming Standard Format Channel Id String>
        [mtokens]: <Forwarded Millitokens String>
        outgoing_channel: <Outgoing Standard Format Channel Id String>
        tokens: <Forwarded Tokens Number>
      }]
      [next]: <Contine With Opaque Paging Token String>
    }

Example:

```node
const {getForwards} = require('ln-service');
const {forwards} = await getForwards({lnd});
```

### getInvoice

Lookup a channel invoice.

The received value and the invoiced value may differ as invoices may be
over-paid.

The `payments` array of HTLCs is only populated on LND versions after 0.7.1

    {
      id: <Payment Hash Id Hex String>
      lnd: <Authenticated LND gRPC API Object>
    }

    @returns via cbk or Promise
    {
      chain_address: <Fallback Chain Address String>
      [confirmed_at]: <Settled at ISO 8601 Date String>
      created_at: <ISO 8601 Date String>
      description: <Description String>
      [description_hash]: <Description Hash Hex String>
      expires_at: <ISO 8601 Date String>
      id: <Payment Hash String>
      [is_canceled]: <Invoice is Canceled Bool>
      is_confirmed: <Invoice is Confirmed Bool>
      [is_held]: <HTLC is Held Bool>
      is_outgoing: <Invoice is Outgoing Bool>
      is_private: <Invoice is Private Bool>
      payments: [{
        [confirmed_at]: <Payment Settled At ISO 8601 Date String>
        created_at: <Payment Held Since ISO 860 Date String>
        created_height: <Payment Held Since Block Height Number>
        in_channel: <Incoming Payment Through Channel Id String>
        is_canceled: <Payment is Canceled Bool>
        is_confirmed: <Payment is Confirmed Bool>
        is_held: <Payment is Held Bool>
        mtokens: <Incoming Payment Millitokens String>
        [pending_index]: <Pending Payment Channel HTLC Index Number>
        tokens: <Payment TOkens Number>
      }]
      received: <Received Tokens Number>
      received_mtokens: <Received Millitokens String>
      request: <Bolt 11 Invoice String>
      secret: <Secret Preimage Hex String>
      tokens: <Tokens Number>
    }

Example:

```node
const {getInvoice} = require('ln-service');
const invoiceDetails = await getInvoice({id, lnd});
```

### getInvoices

Get all created invoices.

If a next token is returned, pass it to get another page of invoices.

The `payments` array of HTLCs is only populated on LND versions after 0.7.1

    {
      [limit]: <Page Result Limit Number>
      lnd: <Authenticated LND gRPC API Object>
      [token]: <Opaque Paging Token String>
    }

    @returns via cbk or Promise
    {
      invoices: [{
        [chain_address]: <Fallback Chain Address String>
        [confirmed_at]: <Settled at ISO 8601 Date String>
        created_at: <ISO 8601 Date String>
        description: <Description String>
        [description_hash]: <Description Hash Hex String>
        expires_at: <ISO 8601 Date String>
        id: <Payment Hash String>
        [is_canceled]: <Invoice is Canceled Bool>
        is_confirmed: <Invoice is Confirmed Bool>
        [is_held]: <HTLC is Held Bool>
        is_outgoing: <Invoice is Outgoing Bool>
        is_private: <Invoice is Private Bool>
        payments: [{
          [confirmed_at]: <Payment Settled At ISO 8601 Date String>
          created_at: <Payment Held Since ISO 860 Date String>
          created_height: <Payment Held Since Block Height Number>
          in_channel: <Incoming Payment Through Channel Id String>
          is_canceled: <Payment is Canceled Bool>
          is_confirmed: <Payment is Confirmed Bool>
          is_held: <Payment is Held Bool>
          mtokens: <Incoming Payment Millitokens String>
          [pending_index]: <Pending Payment Channel HTLC Index Number>
          tokens: <Payment TOkens Number>
        }]
        received: <Received Tokens Number>
        received_mtokens: <Received Millitokens String>
        request: <Bolt 11 Invoice String>
        secret: <Secret Preimage Hex String>
        tokens: <Tokens Number>
      }]
      [next]: <Next Opaque Paging Token String>
    }

Example:

```node
const {getInvoices} = require('ln-service');
const {invoices} = await getInvoices({lnd});
```

### getNetworkGraph

Get the network graph

    {
      lnd: <Authenticated LND gRPC API Object>
    }

    @returns via cbk or Promise
    {
      channels: [{
        capacity: <Channel Capacity Tokens Number>
        id: <Standard Format Channel Id String>
        policies: [{
          [base_fee_mtokens]: <Bae Fee Millitokens String>
          [cltv_delta]: <CLTV Height Delta Number>
          [fee_rate]: <Fee Rate In Millitokens Per Million Number>
          [is_disabled]: <Edge is Disabled Bool>
          [max_htlc_mtokens]: <Maximum HTLC Millitokens String>
          [min_htlc_mtokens]: <Minimum HTLC Millitokens String>
          public_key: <Public Key String>
          [updated_at]: <Last Update Epoch ISO 8601 Date String>
        }]
        transaction_id: <Funding Transaction Id String>
        transaction_vout: <Funding Transaction Output Index Number>
        [updated_at]: <Last Update Epoch ISO 8601 Date String>
      }]
      nodes: [{
        alias: <Name String>
        color: <Hex Encoded Color String>
        public_key: <Node Public Key String>
        sockets: [<Network Address and Port String>]
        updated_at: <Last Updated ISO 8601 Date String>
      }]
    }

Example:

```node
const {getNetworkGraph} = require('ln-service');
const {channels, nodes} = await getNetworkGraph({lnd});
```

### getNetworkInfo

Get network info

    {
      lnd: <Authenticated LND gRPC API Object>
    }

    @returns via cbk or Promise
    {
      average_channel_size: <Tokens Number>
      channel_count: <Channels Count Number>
      max_channel_size: <Tokens Number>
      median_channel_size: <Median Channel Tokens Number>
      min_channel_size: <Tokens Number>
      node_count: <Node Count Number>
      not_recently_updated_policy_count: <Channel Edge Count Number>
      total_capacity: <Total Capacity Number>
    }

Example:

```node
const {getNetworkInfo} = require('ln-service');
const {networkDetails} = await getNetworkInfo({lnd});
```

### getNode

Get information about a node

    {
      [is_omitting_channels]: <Omit Channels from Node Bool>
      lnd: <Authenticated LND gRPC API Object>
      public_key: <Node Public Key Hex String>
    }

    @returns via cbk or Promise
    {
      alias: <Node Alias String>
      capacity: <Node Total Capacity Tokens Number>
      channel_count: <Known Node Channels Number>
      [channels]: [{
        capacity: <Maximum Tokens Number>
        id: <Standard Format Channel Id String>
        policies: [{
          [base_fee_mtokens]: <Base Fee Millitokens String>
          [cltv_delta]: <Locktime Delta Number>
          [fee_rate]: <Fees Charged Per Million Tokens Number>
          [is_disabled]: <Channel Is Disabled Bool>
          [max_htlc_mtokens]: <Maximum HTLC Millitokens Value String>
          [min_htlc_mtokens]: <Minimum HTLC Millitokens Value String>
          public_key: <Node Public Key String>
          [updated_at]: <Policy Last Updated At ISO 8601 Date String>
        }]
        transaction_id: <Transaction Id Hex String>
        transaction_vout: <Transaction Output Index Number>
        [updated_at]: <Channel Last Updated At ISO 8601 Date String>
      }]
      color: <RGB Hex Color String>
      sockets: [{
        socket: <Host and Port String>
        type: <Socket Type String>
      }]
      [updated_at]: <Last Known Update ISO 8601 Date String>
    }

Example:

```node
const {getNode} = require('ln-service');
const publicKey = 'publicKeyHexString';
const nodeDetails = await getNode({lnd, public_key: publicKey});
```

### getPayment

Get the status of a past payment

    {
      id: <Payment Id Hex String>
      lnd: <Authenticated LND gRPC API Object>
    }

    @returns via cbk or Promise
    {
      [failed]: {
        is_invalid_payment: <Failed Due to Payment Rejected At Destination Bool>
        is_pathfinding_timeout: <Failed Due to Pathfinding Timeout Bool>
        is_route_not_found: <Failed Due to Absence of Path Through Graph Bool>
      }
      [is_confirmed]: <Payment Is Settled Bool>
      [is_failed]: <Payment Is Failed Bool>
      [is_pending]: <Payment Is Pending Bool>
      [payment]: {
        fee_mtokens: <Total Fee Millitokens To Pay String>
        hops: [{
          channel: <Standard Format Channel Id String>
          channel_capacity: <Channel Capacity Tokens Number>
          fee_mtokens: <Fee Millitokens String>
          forward_mtokens: <Forward Millitokens String>
          public_key: <Public Key Hex String>
          timeout: <Timeout Block Height Number>
        }]
        id: <Payment Hash Hex String>
        mtokens: <Total Millitokens To Pay String>
        secret: <Payment Preimage Hex String>
        timeout: <Expiration Block Height Number>
      }
    }

Example:

```node
const {getPayment} = require('ln-service');
const id = 'paymentHashHexString';
const payment = await getPayment({id, lnd});
```

### getPayments

Get payments made through channels.

    {
      lnd: <Authenticated LND gRPC API Object>
    }

    @returns via cbk or Promise
    {
      payments: [{
        created_at: <Payment at ISO-8601 Date String>
        destination: <Destination Node Public Key Hex String>
        fee: <Paid Routing Fee Tokens Number>
        fee_mtokens: <Paid Routing Fee in Millitokens String>
        hops: [<Node Hop Public Key Hex String>]
        id: <Payment Preimage Hash String>
        is_confirmed: <Payment is Confirmed Bool>
        is_outgoing: <Transaction Is Outgoing Bool>
        mtokens: <Millitokens Sent to Destination String>
        [request]: <BOLT 11 Payment Request String>
        secret: <Payment Preimage Hex String>
        tokens: <Tokens Sent to Destination Number>
      }]
    }

Example:

```node
const {getPayments} = require('ln-service');
const {payments} = await getPayments({lnd});
```

### getPeers

Get connected peers.

    {
      lnd: <Authenticated LND gRPC API Object>
    }

    @returns via cbk or Promise
    {
      peers: [{
        bytes_received: <Bytes Received Number>
        bytes_sent: <Bytes Sent Number>
        is_inbound: <Is Inbound Peer Bool>
        [is_sync_peer]: <Is Syncing Graph Data Bool>
        ping_time: <Milliseconds Number>
        public_key: <Public Key String>
        socket: <Network Address And Port String>
        tokens_received: <Amount Received Tokens Number>
        tokens_sent: <Amount Sent Tokens Number>
      }]
    }

Example:

```node
const {getPeers} = require('ln-service');
const {peers} = await getPeers({lnd});
```

### getPendingChainBalance

Get pending chain balance in unconfirmed outputs and in channel limbo.

    {
      lnd: <Authenticated LND gRPC API Object>
    }

    @returns via cbk or Promise
    {
      pending_chain_balance: <Pending Chain Balance Tokens Number>
    }

Example:

```node
const {getPendingChainBalance} = require('ln-service');
const totalPending = (await getPendingChainBalance({lnd})).pending_chain_balance;
```

### getPendingChannels

Get pending channels.

Both `is_closing` and `is_opening` are returned as part of a channel because a
channel may be opening, closing, or active.

    {
      lnd: <Authenticated LND gRPC API Object>
    }

    @returns via cbk or Promise
    {
      pending_channels: [{
        [close_transaction_id]: <Channel Closing Transaction Id String>
        is_active: <Channel Is Active Bool>
        is_closing: <Channel Is Closing Bool>
        is_opening: <Channel Is Opening Bool>
        local_balance: <Channel Local Tokens Balance Number>
        local_reserve: <Channel Local Reserved Tokens Number>
        partner_public_key: <Channel Peer Public Key String>
        [pending_balance]: <Tokens Pending Recovery Number>
        [pending_payments]: [{
          is_incoming: <Payment Is Incoming Bool>
          timelock_height: <Payment Timelocked Until Height Number>
          tokens: <Payment Tokens Number>
          transaction_id: <Payment Transaction Id String>
          transaction_vout: <Payment Transaction Vout Number>
        }]
        received: <Tokens Received Number>
        [recovered_tokens]: <Tokens Recovered From Close Number>
        remote_balance: <Remote Tokens Balance Number>
        remote_reserve: <Channel Remote Reserved Tokens Number>
        sent: <Send Tokens Number>
        [timelock_expiration]: <Pending Tokens Block Height Timelock Number>
        [transaction_fee]: <Funding Transaction Fee Tokens Number>
        transaction_id: <Channel Funding Transaction Id String>
        transaction_vout: <Channel Funding Transaction Vout Number>
        [transaction_weight]: <Funding Transaction Weight Number>
      }]
    }

Example:

```node
const {getPendingChannels} = require('ln-service');
const pendingChannels = (await getPendingChannels({lnd})).pending_channels;
```

### getPublicKey

Get a public key in the seed

Requires LND compiled with `walletrpc` build tag

    {
      family: <Key Family Number>
      index: <Key Index Number>
      lnd: <Authenticated gRPC API LND Object>
    }

    @returns via cbk or Promise
    {
      public_key: <Public Key Hex String>
    }

Example:

```node
const {getPublicKey} = require('ln-service');

// Get the public version of a key in the LND wallet HD seed
const publicKey = (await getPublicKey({family: 1, index: 1, lnd}).public_key);
```

### getRouteConfidence

Get routing confidence of successfully routing a payment to a destination

Requires LND built with `routerrpc` build tag

If `from` is not set, self is default

    {
      [from]: <Starting Hex Serialized Public Key>
      hops: [{
        forward_mtokens: <Forward Millitokens String>
        public_key: <Forward Edge Public Key Hex String>
      }]
      lnd: <Authenticated LND gRPC API Object>
    }

    @returns via cbk or Promise
    {
      confidence: <Confidence Score Out Of One Million Number>
    }

Example:

```node
const {getRouteConfidence, getRoutes} = require('ln-service');
const destination = 'destinationPublicKeyHexString';
const [{hops}] = await getRoutes({destination, lnd, tokens: 80085});
// Confidence in payment success
const {confidence} = (await getRouteConfidence({hops, lnd}));
```

### getRouteThroughHops

/** Get an outbound route that goes through specific hops

  Requires LND built with `routerrpc` build tag

  This method is not supported by LND v0.7.1 or below LNDs

  {
    [cltv_delta]: <Final CLTV Delta Number>
    lnd: <Authenticated LND gRPC API Object>
    [mtokens]: <Millitokens to Send String>
    [outgoing_channel]: <Outgoing Channel Id String>
    public_keys: [<Public Key Hex String>]
  }

  @returns via cbk or Promise
  {
    route: {
      fee: <Route Fee Tokens Number>
      fee_mtokens: <Route Fee Millitokens String>
      hops: [{
        channel: <Standard Format Channel Id String>
        channel_capacity: <Channel Capacity Tokens Number>
        fee: <Fee Number>
        fee_mtokens: <Fee Millitokens String>
        forward: <Forward Tokens Number>
        forward_mtokens: <Forward Millitokens String>
        public_key: <Forward Edge Public Key Hex String>
        timeout: <Timeout Block Height Number>
      }]
      mtokens: <Total Fee-Inclusive Millitokens String>
      timeout: <Route Timeout Height Number>
      tokens: <Total Fee-Inclusive Tokens Number>
    }
  }

Example:

```node
const {getRouteThroughHops, payViaRoutes} = require('ln-service');
const destination = 'destinationPublicKeyHexString';
const mtokens = 1000;
const peer = 'peerPublicKeyHexString';
const {route} = await getRouteThroughHops({lnd, public_keys: [peer, destination]});
await payViaRoutes({lnd, routes: [route]});
```

### getRoutes

Get routes a payment can travel towards a destination

When paying to a private route, make sure to pass the final destination in
addition to routes.

`is_adjusted_for_past_failures` will turn on past-fail adjusted pathfinding

Setting both `start` and `outgoing_channel` is not supported

`confidence` is not supported in LND 0.7.1
`max_timeout_height` is not supported in LND 0.7.1

    {
      [cltv_delta]: <Final CLTV Delta Number>
      [destination]: <Final Send Destination Hex Encoded Public Key String>
      [get_channel]: <Custom Get Channel Function>
      [ignore]: [{
        [channel]: <Channel Id String>
        from_public_key: <Public Key Hex String>
        [to_public_key]: <To Public Key Hex String>
      }]
      [is_adjusted_for_past_failures]: <Routes are Failures-Adjusted Bool>
      [is_strict_hints]: <Only Route Through Specified Routes Paths Bool>
      lnd: <Authenticated LND gRPC API Object>
      [max_fee]: <Maximum Fee Tokens Number>
      [max_timeout_height]: <Max CLTV Timeout Number>
      [outgoing_channel]: <Outgoing Channel Id String>
      [routes]: [[{
        [base_fee_mtokens]: <Base Routing Fee In Millitokens String>
        [channel]: <Standard Format Channel Id String>
        [channel_capacity]: <Channel Capacity Tokens Number>
        [cltv_delta]: <CLTV Delta Blocks Number>
        [fee_rate]: <Fee Rate In Millitokens Per Million Number>
        public_key: <Forward Edge Public Key Hex String>
      }]]
      [start]: <Starting Node Public Key Hex String>
      [tokens]: <Tokens to Send Number>
    }

    @returns via cbk or Promise
    {
      routes: [{
        [confidence]: <Route Confidence Score Out Of One Million Number>
        fee: <Route Fee Tokens Number>
        fee_mtokens: <Route Fee Millitokens String>
        hops: [{
          channel: <Standard Format Channel Id String>
          channel_capacity: <Channel Capacity Tokens Number>
          fee: <Fee Number>
          fee_mtokens: <Fee Millitokens String>
          forward: <Forward Tokens Number>
          forward_mtokens: <Forward Millitokens String>
          public_key: <Forward Edge Public Key Hex String>
          timeout: <Timeout Block Height Number>
        }]
        mtokens: <Total Fee-Inclusive Millitokens String>
        timeout: <Final CLTV Delta Number>
        tokens: <Total Fee-Inclusive Tokens Number>
      }]
    }

Example:

```node
const {getRoutes} = require('ln-service');
const destination = 'destinationPublicKeyHexString';
const tokens = 1000;
const {routes} = await getRoutes({destination, lnd, tokens});
```

### getTowerServerInfo

Get watchtower server info.

    {
      lnd: <Authenticated LND gRPC API Object>
    }

    @returns via cbk or Promise
    {
      [tower]: {
        public_key: <Watchtower Server Public Key Hex String>
        sockets: [<Socket String>]
        uris: [<Watchtower External URI String>]
      }
    }

Example:

```node
const {getTowerServerInfo} = require('ln-service');
const towerInfo = await getTowerServerInfo({lnd});
```

### getUtxos

Get unspent transaction outputs

    {
      lnd: <Authenticated LND gRPC API Object>
      [max_confirmations]: <Maximum Confirmations Number>
      [min_confirmations]: <Minimum Confirmations Number>
    }

    @returns via cbk or Promise
    {
      utxos: [{
        address: <Chain Address String>
        address_format: <Chain Address Format String>
        confirmation_count: <Confirmation Count Number>
        output_script: <Output Script Hex String>
        tokens: <Unspent Tokens Number>
        transaction_id: <Transaction Id Hex String>
        transaction_vout: <Transaction Output Index Number>
      }]
    }

Example:

```node
const {getUtxos} = require('ln-service');
const {utxos} = await getUtxos({lnd});
```

### getWalletInfo

Get overall wallet info.

    {
      lnd: <Authenticated LND gRPC API Object>
    }

    @returns via cbk or Promise
    {
      active_channels_count: <Active Channels Count Number>
      alias: <Node Alias String>
      chains: [<Chain Id Hex String>]
      color: <Node Color String>
      current_block_hash: <Best Chain Hash Hex String>
      current_block_height: <Best Chain Height Number>
      is_synced_to_chain: <Is Synced To Chain Bool>
      latest_block_at: <Latest Known Block At Date String>
      peers_count: <Peer Count Number>
      pending_channels_count: <Pending Channels Count Number>
      public_key: <Public Key String>
    }

Example:

```node
const {getWalletInfo} = require('ln-service');
const walletInfo = await getWalletInfo({lnd});
```

### grantAccess

Give access to the node by making a macaroon access credential

Note: granting access is not supported in LND versions 0.8.0 and below

Note: access once given cannot be revoked

    {
      [is_ok_to_create_chain_addresses]: <Can Make New Addresses Bool>
      [is_ok_to_create_invoices]: <Can Create Lightning Invoices Bool>
      [is_ok_to_create_macaroons]: <Can Create Macaroons Bool>
      [is_ok_to_adjust_peers]: <Can Add or Remove Peers Bool>
      [is_ok_to_get_chain_transactions]: <Can See Chain Transactions Bool>
      [is_ok_to_get_invoices]: <Can See Invoices Bool>
      [is_ok_to_get_wallet_info]: <Can General Graph and Wallet Information Bool>
      [is_ok_to_get_payments]: <Can Get Historical Lightning Transactions Bool>
      [is_ok_to_get_peers]: <Can Get Node Peers Information Bool>
      [is_ok_to_pay]: <Can Send Funds or Edit Lightning Payments Bool>
      [is_ok_to_send_to_chain_addresses]: <Can Send Coins On Chain Bool>
      [is_ok_to_sign_messages]: <Can Sign Messages From Node Key Bool>
      [is_ok_to_stop_daemon]: <Can Terminate Node or Change Operation Mode Bool>
      [is_ok_to_verify_messages]: <Can Verify Messages From Node Keys Bool>
      lnd: <Authenticated LND gRPC API Object>
    }

    @returns via cbk or Promise
    {
      macaroon: <Base64 Encoded Macaroon String>
    }

```node
const {createInvoice, grantAccess} = require('ln-service');

// Make a macaroon that can only create invoices
const {macaroon} = await grantAccess({lnd, is_ok_to_create_invoices: true});

// LND connection using the node cert and socket, with the restricted macaroon
const createInvoices = authenticatedLndGrpc({cert, macaroon, socket});

// Payment requests can be made with this special limited LND connection
const {request} = await createInvoice({lnd: createInvoices.lnd, tokens: 1});
```

### isDestinationPayable

Determine if a payment destination is actually payable by probing it

Requires lnd built with routerrpc build tag

Note: on versions of lnd prior to 0.7.1, is_payable will always be false

    {
      [cltv_delta]: <Final CLTV Delta Number>
      destination: <Pay to Node with Public Key Hex String>
      lnd: <Authenticated LND gRPC API Object>
      [max_fee]: <Maximum Fee Tokens To Pay Number>
      [max_timeout_height]: <Maximum Expiration CLTV Timeout Height Number>
      [outgoing_channel]: <Pay Out of Outgoing Standard Format Channel Id String>
      [pathfinding_timeout]: <Time to Spend Finding a Route Milliseconds Number>
      [routes]: [[{
        [base_fee_mtokens]: <Base Routing Fee In Millitokens String>
        [channel]: <Standard Format Channel Id String>
        [cltv_delta]: <CLTV Blocks Delta Number>
        [fee_rate]: <Fee Rate In Millitokens Per Million Number>
        public_key: <Forward Edge Public Key Hex String>
      }]]
      [tokens]: <Paying Tokens Number>
    }

    @returns via cbk or Promise
    {
      is_payable: <Payment Is Successfully Tested Within Constraints Bool>
    }

Example:

```node
const {decodePaymentRequest, isDestinationPayable} = require('ln-service');
const request = 'lnbc1pvjluezpp5qqqsyq...';
const {destination, tokens} = await decodePaymentRequest({lnd, request});
const isPayable = (await isDestinationPayable({lnd, }))
```

### openChannel

Open a new channel.

The capacity of the channel is set with local_tokens

If give_tokens is set, it is a gift and it does not alter the capacity

    {
      [chain_fee_tokens_per_vbyte]: <Chain Fee Tokens Per VByte Number>
      [give_tokens]: <Tokens to Gift To Partner Number> // Defaults to zero
      [is_private]: <Channel is Private Bool> // Defaults to false
      lnd: <Authenticated LND gRPC API Object>
      local_tokens: <Local Tokens Number>
      [min_confirmations]: <Spend UTXOs With Minimum Confirmations Number>
      [min_htlc_mtokens]: <Minimum HTLC Millitokens String>
      partner_public_key: <Public Key Hex String>
      [partner_csv_delay]: <Peer Output CSV Delay Number>
    }

    @returns via cbk or Promise
    {
      transaction_id: <Funding Transaction Id String>
      transaction_vout: <Funding Transaction Output Index Number>
    }

Example:

```node
const {openChannel} = require('ln-service');  
const publicKey = 'publicKeyHexString';
const tokens = 1000000;
await openChannel({lnd, local_tokens: tokens, partner_public_key: publicKey});
```

### parsePaymentRequest

Parse a BOLT 11 payment request into its component data

Note: either description or description_hash will be returned

    {
      request: <BOLT 11 Payment Request String>
    }

    @throws
    <ExpectedLnPrefix Error>
    <ExpectedPaymentHash Error>
    <ExpectedPaymentRequest Error>
    <ExpectedValidHrpForPaymentRequest Error>
    <FailedToParsePaymentRequestDescriptionHash Error>
    <FailedToParsePaymentRequestFallbackAddress Error>
    <FailedToParsePaymentRequestPaymentHash Error>
    <InvalidDescriptionInPaymentRequest Error>
    <InvalidOrMissingSignature Error>
    <InvalidPaymentHashByteLength Error>
    <InvalidPaymentRequestPrefix Error>
    <UnknownCurrencyCodeInPaymentRequest Error>

    @returns
    {
      [chain_addresses]: [<Chain Address String>]
      cltv_delta: <CLTV Delta Number>
      created_at: <Invoice Creation Date ISO 8601 String>
      [description]: <Description String>
      [description_hash]: <Description Hash Hex String>
      destination: <Public Key String>
      expires_at: <ISO 8601 Date String>
      id: <Payment Request Hash String>
      is_expired: <Invoice is Expired Bool>
      [mtokens]: <Requested Milli-Tokens Value String> (can exceed Number limit)
      network: <Network Name String>
      [routes]: [[{
        [base_fee_mtokens]: <Base Fee Millitokens String>
        [channel]: <Standard Format Channel Id String>
        [cltv_delta]: <Final CLTV Expiration Blocks Delta Number>
        [fee_rate]: <Fee Rate Millitokens Per Million Number>
        public_key: <Forward Edge Public Key Hex String>
      }]]
      [tokens]: <Requested Chain Tokens Number> (note: can differ from mtokens)
    }

```
const {parsePaymentRequest} = require('ln-service');
const requestDetails = parsePaymentRequest({request: 'paymentRequestString'});
```

### pay

Make a payment.

Either a payment path or a BOLT 11 payment request is required

For paying to private destinations along set paths, a public key in the route
hops is required to form the route.

    {
      lnd: <Authenticated LND gRPC API Object>
      [log]: <Log Function> // Required if wss is set
      [max_fee]: <Maximum Additional Fee Tokens To Pay Number>
      [max_timeout_height]: <Max CLTV Timeout Number>
      [outgoing_channel]: <Pay Through Outbound Standard Channel Id String>
      [path]: {
        id: <Payment Hash Hex String>
        routes: [{
          fee: <Total Fee Tokens To Pay Number>
          fee_mtokens: <Total Fee Millitokens To Pay String>
          hops: [{
            channel: <Standard Format Channel Id String>
            channel_capacity: <Channel Capacity Tokens Number>
            fee: <Fee Number>
            fee_mtokens: <Fee Millitokens String>
            forward: <Forward Tokens Number>
            forward_mtokens: <Forward Millitokens String>
            [public_key]: <Public Key Hex String>
            timeout: <Timeout Block Height Number>
          }]
          mtokens: <Total Millitokens To Pay String>
          timeout: <Expiration Block Height Number>
          tokens: <Total Tokens To Pay Number>
        }]
      }
      [pathfinding_timeout]: <Time to Spend Finding a Route Milliseconds Number>
      [request]: <BOLT 11 Payment Request String>
      [tokens]: <Total Tokens To Pay to Payment Request Number>
      [wss]: [<Web Socket Server Object>]
    }

    @returns via cbk or Promise
    {
      fee: <Fee Paid Tokens Number>
      fee_mtokens: <Fee Paid Millitokens String>
      hops: [{
        channel: <Standard Format Channel Id String>
        channel_capacity: <Hop Channel Capacity Tokens Number>
        fee_mtokens: <Hop Forward Fee Millitokens String>
        forward_mtokens: <Hop Forwarded Millitokens String>
        timeout: <Hop CLTV Expiry Block Height Number>
      }]
      id: <Payment Hash Hex String>
      is_confirmed: <Is Confirmed Bool>
      is_outgoing: <Is Outoing Bool>
      mtokens: <Total Millitokens Sent String>
      secret: <Payment Secret Preimage Hex String>
      tokens: <Total Tokens Sent Number>
    }

Example:

```node
const {pay} = require('ln-service');
const request = 'bolt11encodedpaymentrequest';
await pay({lnd, request});
```

### payViaPaymentDetails

Pay via payment details

Requires lnd built with routerrpc build tag

    {
      [cltv_delta]: <Final CLTV Delta Number>
      destination: <Destination Public Key String>
      [id]: <Payment Request Hash Hex String>
      lnd: <Authenticated LND gRPC API Object>
      [max_fee]: <Maximum Fee Tokens To Pay Number>
      [max_timeout_height]: <Maximum Expiration CLTV Timeout Height Number>
      [outgoing_channel]: <Pay Out of Outgoing Channel Id String>
      [pathfinding_timeout]: <Time to Spend Finding a Route Milliseconds Number>
      tokens: <Tokens To Pay Number>
    }

    @returns via cbk or Promise
    {
      fee_mtokens: <Total Fee Millitokens To Pay String>
      hops: [{
        channel: <Standard Format Channel Id String>
        channel_capacity: <Channel Capacity Tokens Number>
        fee_mtokens: <Fee Millitokens String>
        forward_mtokens: <Forward Millitokens String>
        public_key: <Public Key Hex String>
        timeout: <Timeout Block Height Number>
      }]
      [id]: <Payment Hash Hex String>
      mtokens: <Total Millitokens To Pay String>
      secret: <Payment Preimage Hex String>
    }

Example:

```node
const {payViaPaymentDetails} = require('ln-service');
const destination = 'invoiceDestinationNodePublicKeyHexString';
const id = 'paymentRequestPreimageHashHexString';
const tokens = 80085;
await payViaPaymentDetails({destination, id, lnd, tokens});
```

### payViaPaymentRequest

Pay via payment request

Requires lnd built with routerrpc build tag

    {
      lnd: <Authenticated LND gRPC API Object>
      [max_fee]: <Maximum Fee Tokens To Pay Number>
      [max_timeout_height]: <Maximum Expiration CLTV Timeout Height Number>
      [outgoing_channel]: <Pay Out of Outgoing Channel Id String>
      [pathfinding_timeout]: <Time to Spend Finding a Route Milliseconds Number>
      request: <BOLT 11 Payment Request String>
      [tokens]: <Tokens To Pay Number>
    }

    @returns via cbk or Promise
    {
      fee_mtokens: <Total Fee Millitokens To Pay String>
      hops: [{
        channel: <Standard Format Channel Id String>
        channel_capacity: <Channel Capacity Tokens Number>
        fee_mtokens: <Fee Millitokens String>
        forward_mtokens: <Forward Millitokens String>
        public_key: <Public Key Hex String>
        timeout: <Timeout Block Height Number>
      }]
      [id]: <Payment Hash Hex String>
      mtokens: <Total Millitokens To Pay String>
      secret: <Payment Preimage Hex String>
    }

Example:

```node
const {payViaPaymentRequest} = require('ln-service');
const request = 'bolt11PaymentRequestString';
await payViaPaymentRequest({lnd, request});
```

### payViaRoutes

Make a payment via a specified route

Requires lnd built with routerrpc build tag

If no id is specified, a random id will be used

    {
      [id]: <Payment Hash Hex String>
      lnd: <Authenticated LND gRPC API Object>
      [pathfinding_timeout]: <Time to Spend Finding a Route Milliseconds Number>
      routes: [{
        fee: <Total Fee Tokens To Pay Number>
        fee_mtokens: <Total Fee Millitokens To Pay String>
        hops: [{
          channel: <Standard Format Channel Id String>
          channel_capacity: <Channel Capacity Tokens Number>
          fee: <Fee Number>
          fee_mtokens: <Fee Millitokens String>
          forward: <Forward Tokens Number>
          forward_mtokens: <Forward Millitokens String>
          [public_key]: <Public Key Hex String>
          timeout: <Timeout Block Height Number>
        }]
        mtokens: <Total Millitokens To Pay String>
        timeout: <Expiration Block Height Number>
        tokens: <Total Tokens To Pay Number>
      }]
    }

    @returns via cbk or Promise
    {
      failures: [[
        <Failure Code Number>
        <Failure Code Message String>
        <Failure Code Details Object>
      ]]
      fee: <Fee Paid Tokens Number>
      fee_mtokens: <Fee Paid Millitokens String>
      hops: [{
        channel: <Standard Format Channel Id String>
        channel_capacity: <Hop Channel Capacity Tokens Number>
        fee_mtokens: <Hop Forward Fee Millitokens String>
        forward_mtokens: <Hop Forwarded Millitokens String>
        timeout: <Hop CLTV Expiry Block Height Number>
      }]
      id: <Payment Hash Hex String>
      is_confirmed: <Is Confirmed Bool>
      is_outgoing: <Is Outoing Bool>
      mtokens: <Total Millitokens Sent String>
      secret: <Payment Secret Preimage Hex String>
      tokens: <Total Tokens Sent Number>
    }

    @returns error via cbk or Promise
    [
      <Error Classification Code Number>
      <Error Type String>
      {
        failures: [[
          <Failure Code Number>
          <Failure Code Message String>
          <Failure Code Details Object>
        ]]
      }
    ]

Example:

```node
const {getRoutes, payViaRoutes} = require('ln-service');
const destination = 'destinationPublicKeyHexString';
const tokens = 80085;
const {routes} = await getRoutes({destination, lnd, tokens});
const preimage = (await payViaRoutes({lnd, routes})).secret;
```

### probe

Probe routes to find a successful route

It's better to use `probeForRoute` instead of this method, but this method
does not require the `routerrpc` build tag.

    {
      [limit]: <Simultaneous Attempt Limit Number>
      lnd: <Authenticated LND gRPC API Object>
      routes: [{
        fee: <Total Fee Tokens To Pay Number>
        fee_mtokens: <Total Fee Millitokens To Pay String>
        hops: [{
          channel: <Standard Format Channel Id String>
          channel_capacity: <Channel Capacity Tokens Number>
          fee: <Fee Number>
          fee_mtokens: <Fee Millitokens String>
          forward: <Forward Tokens Number>
          forward_mtokens: <Forward Millitokens String>
          [public_key]: <Public Key Hex String>
          timeout: <Timeout Block Height Number>
        }]
      }]
      [timeout]: <Probe Timeout Milliseconds Number>
    }

    @returns via cbk or Promise
    {
      generic_failures: [{
        channel: <Standard Format Channel Id String>
        public_key: <Failed Edge Public Key Hex String>
      }]
      [route]: {
        fee: <Total Fee Tokens To Pay Number>
        fee_mtokens: <Total Fee Millitokens To Pay String>
        hops: [{
          channel: <Standard Format Channel Id String>
          channel_capacity: <Channel Capacity Tokens Number>
          fee: <Fee Number>
          fee_mtokens: <Fee Millitokens String>
          forward: <Forward Tokens Number>
          forward_mtokens: <Forward Millitokens String>
          [public_key]: <Public Key Hex String>
          timeout: <Timeout Block Height Number>
        }]
      }
      stuck: [{
        channel: <Standard Format Channel Id String>
        public_key: <Public Key Hex String>
      }]
      successes: [{
        channel: <Standard Format Channel Id String>
        public_key: <Public Key Hex String>
      }]
      temporary_failures: [{
        channel: <Standard Format Channel Id String>
        public_key: <Public Key Hex String>
      }]
    }

Example:

```node
const {getRoutes, probe} = require('ln-service');
const destination = 'destinationPublicKeyHexString';
const tokens = 80085;
const {routes} = await getRoutes({destination, lnd, tokens});
const {route} = await probe({lnd, routes});
```

### probeForRoute

Requires LND built with `routerrpc` build tag

`is_ignoring_past_failures` will turn off LND 0.7.1+ past failure pathfinding

    {
      [cltv_delta]: <Final CLTV Delta Number>
      destination: <Destination Public Key Hex String>
      [ignore]: [{
        [channel]: <Channel Id String>
        from_public_key: <Public Key Hex String>
        [to_public_key]: <To Public Key Hex String>
      }]
      [is_ignoring_past_failures]: <Adjust Probe For Past Routing Failures Bool>
      [is_strict_hints]: <Only Route Through Specified Paths Bool>
      lnd: <Authenticated LND gRPC API Object>
      [max_fee]: <Maximum Fee Tokens Number>
      [pathfinding_timeout]: <Time to Spend Finding a Route Milliseconds Number>
      [routes]: [[{
        [base_fee_mtokens]: <Base Routing Fee In Millitokens Number>
        [channel_capacity]: <Channel Capacity Tokens Number>
        [channel]: <Standard Format Channel Id String>
        [cltv_delta]: <CLTV Blocks Delta Number>
        [fee_rate]: <Fee Rate In Millitokens Per Million Number>
        public_key: <Forward Edge Public Key Hex String>
      }]]
      tokens: <Tokens Number>
    }

    @returns via cbk or Promise
    {
      [route]: {
        fee: <Route Fee Tokens Number>
        fee_mtokens: <Route Fee Millitokens String>
        hops: [{
          channel: <Standard Format Channel Id String>
          channel_capacity: <Channel Capacity Tokens Number>
          fee: <Fee Number>
          fee_mtokens: <Fee Millitokens String>
          forward: <Forward Tokens Number>
          forward_mtokens: <Forward Millitokens String>
          public_key: <Forward Edge Public Key Hex String>
          timeout: <Timeout Block Height Number>
        }]
        mtokens: <Total Fee-Inclusive Millitokens String>
        timeout: <Timeout Block Height Number>
        tokens: <Total Fee-Inclusive Tokens Number>
      }
    }

Example:

```node
const {probeForRoute} = require('ln-service');
const destination = 'destinationNodePublicKeyHexString';
const tokens = 80085;
const {route} = await probeForRoute({destination, lnd, tokens});
```

### recoverFundsFromChannel

Verify and restore a channel from a single channel backup

    {
      backup: <Backup Hex String>
      lnd: <Authenticated LND gRPC API Object>
    }

    @returns via cbk or Promise
    {}

Example:

```node
const {getBackup, recoverFundsFromChannel} = require('ln-service');
const {backup} = await getBackup({lnd, transaction_id: id, transaction_vout: i});
await recoverFundsFromChannel({backup, lnd});
```

### recoverFundsFromChannels

Verify and restore channels from a multi-channel backup

    {
      backup: <Backup Hex String>
      lnd: <Authenticated LND gRPC API Object>
    }

    @returns via cbk or Promise

Example:

```node
const {getBackups, recoverFundsFromChannels} = require('ln-service');
const {backup} = await getBackups({lnd});
await recoverFundsFromChannels({backup, lnd});
```

### removePeer

Remove a peer if possible

    {
      lnd: <Authenticated LND gRPC API Object>
      public_key: <Public Key Hex String>
    }

    @returns via cbk or Promise

Example:

```node
const {removePeer} = require('ln-service');
const connectedPeerPublicKey = 'nodePublicKeyHexString';
await removePeer({lnd, public_key: connectedPeerPublicKey});
```

### routeFromChannels

Get a route from a sequence of channels

    {
      channels: [{
        capacity: <Maximum Tokens Number>
        id: <Standard Format Channel Id String>
        policies: [{
          base_fee_mtokens: <Base Fee Millitokens String>
          cltv_delta: <Locktime Delta Number>
          fee_rate: <Fees Charged Per Million Tokens Number>
          is_disabled: <Channel Is Disabled Bool>
          min_htlc_mtokens: <Minimum HTLC Millitokens Value String>
          public_key: <Node Public Key String>
        }]
      }]
      [cltv_delta]: <Final Cltv Delta Number>
      destination: <Destination Public Key Hex String>
      height: <Current Block Height Number>
      mtokens: <Millitokens To Send String>
    }

    @throws
    <Error>

    @returns
    {
      route: {
        fee: <Total Fee Tokens To Pay Number>
        fee_mtokens: <Total Fee Millitokens To Pay String>
        hops: [{
          channel: <Standard Format Channel Id String>
          channel_capacity: <Channel Capacity Tokens Number>
          fee: <Fee Number>
          fee_mtokens: <Fee Millitokens String>
          forward: <Forward Tokens Number>
          forward_mtokens: <Forward Millitokens String>
          [public_key]: <Public Key Hex String>
          timeout: <Timeout Block Height Number>
        }]
        mtokens: <Total Fee-Inclusive Millitokens String>
        timeout: <Timeout Block Height Number>
        tokens: <Total Fee-Inclusive Tokens Number>
      }
    }

Example:

```node
const {getChannel, getChannels, routeFromChannels} = require('ln-service');
const {getWalletInfo} = require('ln-service');
const [{id}] = await getChannels({lnd});
const channels = [(await getChannel({lnd, id}))];
const destination = 'destinationNodePublicKeyHexString';
const height = (await getWalletInfo({lnd})).current_block_height;
const mtokens = '1000';
const res = routeFromChannels({channels, destination, height, mtokens});
const {route} = res;
```

### sendToChainAddress

Send tokens in a blockchain transaction.

    {
      address: <Destination Chain Address String>
      [fee_tokens_per_vbyte]: <Chain Fee Tokens Per Virtual Byte Number>
      [is_send_all]: <Send All Funds Bool>
      lnd: <Authenticated LND gRPC API Object>
      [log]: <Log Function>
      [target_confirmations]: <Confirmations To Wait Number>
      tokens: <Tokens To Send Number>
      [wss]: [<Web Socket Server Object>]
    }

    @returns via cbk or Promise
    {
      confirmation_count: <Total Confirmations Number>
      id: <Transaction Id Hex String>
      is_confirmed: <Transaction Is Confirmed Bool>
      is_outgoing: <Transaction Is Outgoing Bool>
      tokens: <Transaction Tokens Number>
    }

Example:

```node
const {sendToChainAddress} = require('ln-service');
const address = 'regularOnChainAddress';
const tokens = 80085;
await sendToChainAddresses({address, lnd, tokens});
```

### sendToChainAddresses

Send tokens to multiple destinations in a blockchain transaction.

    {
      [fee_tokens_per_vbyte]: <Chain Fee Tokens Per Virtual Byte Number>
      lnd: <Authenticated LND gRPC API Object>
      [log]: <Log Function>
      send_to: [{
        address: <Address String>
        tokens: <Tokens Number>
      }]
      [target_confirmations]: <Confirmations To Wait Number>
      [wss]: [<Web Socket Server Object>]
    }

    @returns via cbk or Promise
    {
      confirmation_count: <Total Confirmations Number>
      id: <Transaction Id Hex String>
      is_confirmed: <Transaction Is Confirmed Bool>
      is_outgoing: <Transaction Is Outgoing Bool>
      tokens: <Transaction Tokens Number>
    }

Example:

```node
const {sendToChainAddresses} = require('ln-service');
const sendTo = [{address: 'onChainAddress', tokens: 80085}];
await sendToChainAddresses({lnd, send_to: sendTo});
```

### setAutopilot

Configure Autopilot settings

Either `candidate_nodes` or `is_enabled` is required
Candidate node scores range from 1 to 100,000,000

    {
      [candidate_nodes]: [{
        public_key: <Node Public Key Hex String>
        score: <Score Number>
      }]
      [is_enabled]: <Enable Autopilot Bool>
      lnd: <Authenticated LND gRPC Object>
    }

    @returns via cbk or Promise

Example:

```node
const {setAutopilot} = require('ln-service');
await setAutopilot({is_enabled: false, lnd});
```

### settleHodlInvoice

Settle hodl invoice

requires lnd built with invoicesrpc build tag

    {
      lnd: <Authenticated LND gRPC API Object>
      secret: <Payment Preimage Hex String>
    }

    @returns via cbk or Promise

Example:

```node
const {randomBytes} = require('crypto');
const {settleHodlInvoice} = require('ln-service');
await settleHodlInvoice({lnd, secret: randomBytes(32).toString('hex')});
```

### signMessage

Sign a message

    {
      lnd: <Authenticated LND gRPC API Object>
      message: <Message String>
    }

    @returns via cbk or Promise
    {
      signature: <Signature String>
    }

Example:

```node
const {signMessage} = require('ln-service');
const {signature} = await signMessage({lnd, message: 'hello world'});
```

### signTransaction

Sign transaction

Requires lnd built with signerrpc build tag

    {
      inputs: [{
        key_family: <Key Family Number>
        key_index: <Key Index Number>
        output_script: <Output Script Hex String>
        output_tokens: <Output Tokens Number>
        sighash: <Sighash Type Number>
        vin: <Input Index To Sign Number>
        witness_script: <Witness Script Hex String>
      }]
      lnd: <Authenticated LND gRPC API Object>
      transaction: <Unsigned Transaction Hex String>
    }

    @returns via cbk or Promise
    {
      signatures: [<Signature Hex String>]
    }

Example:

```node
const {signTransaction} = require('ln-service');
const {signatures} = await signTransaction({inputs, lnd, transaction});
```

### stopDaemon

Stop the Lightning daemon.

    {
      lnd: <Authenticated LND gRPC API Object>
    }

    @returns via cbk or Promise

Example:

```node
const {stopDaemon} = require('ln-service');
await stopDaemon({lnd});
```

### subscribeToBackups

Subscribe to backup snapshot updates

    {
      lnd: <Authenticated LND gRPC API Object>
    }

    @throws
    <Error>

    @returns
    <EventEmitter Object>

    @event 'backup'
    {
      backup: <Backup Hex String>
      channels: [{
        backup: <Backup Hex String>
        transaction_id: <Funding Transaction Id Hex String>
        transaction_vout: <Funding Transaction Output Index Number>
      }]
    }

Example:

```node
const {subscribeToBackups} = reuqire('ln-service');
const sub = subscribeToBackups({lnd});
let currentBackup;
sub.on('backup', ({backup}) => currentBackup = backup);
```

### subscribeToBlocks

Subscribe to blocks

Requires lnd built with chainrpc build tag

    {
      lnd: <Authenticated LND gRPC Object>
    }

    @throws
    <Error>

    @returns
    <EventEmitter Object>

    @event 'block'
    {
      height: <Block Height Number>
      id: <Block Hash String>
    }

Example:

```node
const {subscribeToBlocks} = require('ln-service');
let chainTipBlockHash;
const sub = subscribeToBlocks({lnd});
sub.on('block', ({id}) => chainTipBlockHash = id);
```

### subscribeToChainAddress

Subscribe to confirmation details about transactions sent to an address

Requires lnd built with chainrpc build tag

One and only one chain address or output script is required

    {
      [bech32_address]: <Address String>
      lnd: <Chain RPC LND gRPC API Object>
      [min_confirmations]: <Minimum Confirmations Number>
      min_height: <Minimum Transaction Inclusion Blockchain Height Number>
      [output_script]: <Output Script Hex String>
      [p2pkh_address]: <Address String>
      [p2sh_address]: <Address String>
      [transaction_id]: <Blockchain Transaction Id String>
    }

    @throws
    <Error>

    @returns
    <EventEmitter Object>

    @event 'confirmation'
    {
      block: <Block Hash Hex String>
      height: <Block Best Chain Height Number>
      transaction: <Raw Transaction Hex String>
    }

    @event 'reorg'

Example:

```node
const {subscribeToChainAddress} = require('ln-service');
const address = 'bech32Address';
let confirmationBlockHash;
const sub = subscribeToChainAddress({lnd, bech32_address: address});
sub.on('confirmation', ({block}) => confirmationBlockHash = block);
```

### subscribeToChainSpend

Subscribe to confirmations of a spend

An LND built with the `chainrpc` build tag is required

A chain address or raw output script is required

    {
      [bech32_address]: <Bech32 P2WPKH or P2WSH Address String>
      lnd: <Chain RPC LND gRPC API Object>
      min_height: <Minimum Transaction Inclusion Blockchain Height Number>
      [output_script]: <Output Script AKA ScriptPub Hex String>
      [p2pkh_address]: <Pay to Public Key Hash Address String>
      [p2sh_address]: <Pay to Script Hash Address String>
      [transaction_id]: <Blockchain Transaction Id Hex String>
      [transaction_vout]: <Blockchain Transaction Output Index Number>
    }

    @throws
    <Error>

    @returns
    <EventEmitter Object>

    @event 'confirmation'
    {
      height: <Confirmation Block Height Number>
      transaction: <Raw Transaction Hex String>
      vin: <Spend Outpoint Index Number>
    }

    @event 'reorg'

Example:

```node
const {subscribeToChainSpend} = require('ln-service');
const address = 'bech32Address';
let confirmationHeight;
const sub = subscribeToChainSpend({lnd, bech32_address: address});
sub.on('conirmation', ({height}) => confirmationHeight = height);
```

### subscribeToChannels

Subscribe to channel updates

    {
      lnd: <Authenticated LND gRPC API Object>
    }

    @throws
    <Error>

    @returns
    <EventEmitter Object>

    @event 'channel_active_changed'
    {
      is_active: <Channel Is Active Bool>
      transaction_id: <Channel Funding Transaction Id String>
      transaction_vout: <Channel Funding Transaction Output Index Number>
    }

    @event 'channel_closed'
    {
      capacity: <Closed Channel Capacity Tokens Number>
      [close_confirm_height]: <Channel Close Confirmation Height Number>
      [close_transaction_id]: <Closing Transaction Id Hex String>
      final_local_balance: <Channel Close Final Local Balance Tokens Number>
      final_time_locked_balance: <Closed Channel Timelocked Tokens Number>
      [id]: <Closed Standard Format Channel Id String>
      is_breach_close: <Is Breach Close Bool>
      is_cooperative_close: <Is Cooperative Close Bool>
      is_funding_cancel: <Is Funding Cancelled Close Bool>
      is_local_force_close: <Is Local Force Close Bool>
      is_remote_force_close: <Is Remote Force close Bool>
      partner_public_key: <Partner Public Key Hex String>
      transaction_id: <Channel Funding Transaction Id Hex String>
      transaction_vout: <Channel Funding Output Index Number>
    }

    @event 'channel_opened'
    {
      capacity: <Channel Token Capacity Number>
      commit_transaction_fee: <Commit Transaction Fee Number>
      commit_transaction_weight: <Commit Transaction Weight Number>
      is_active: <Channel Active Bool>
      is_closing: <Channel Is Closing Bool>
      is_opening: <Channel Is Opening Bool>
      is_partner_initiated: <Channel Partner Opened Channel>
      is_private: <Channel Is Private Bool>
      local_balance: <Local Balance Tokens Number>
      partner_public_key: <Channel Partner Public Key String>
      pending_payments: [{
        id: <Payment Preimage Hash Hex String>
        is_outgoing: <Payment Is Outgoing Bool>
        timeout: <Chain Height Expiration Number>
        tokens: <Payment Tokens Number>
      }]
      received: <Received Tokens Number>
      remote_balance: <Remote Balance Tokens Number>
      sent: <Sent Tokens Number>
      transaction_id: <Blockchain Transaction Id String>
      transaction_vout: <Blockchain Transaction Vout Number>
      unsettled_balance: <Unsettled Balance Tokens Number>
    }

Example:

```node
const {once} = require('events');
const {subscribeToChannels} = require('ln-service');
const sub = subscribeToChannels({lnd});
const [openedChannel] = await once(sub, 'channel_opened');
```

### subscribeToGraph

Subscribe to graph updates

    {
      lnd: <Authenticated LND gRPC API Object>
    }

    @throws
    <Error>

    @returns
    <EventEmitter Object>

    @event 'channel_updated'
    {
      base_fee_mtokens: <Channel Base Fee Millitokens String>
      capacity: <Channel Capacity Tokens Number>
      cltv_delta: <Channel CLTV Delta Number>
      fee_rate: <Channel Feel Rate In Millitokens Per Million Number>
      id: <Standard Format Channel Id String>
      is_disabled: <Channel Is Disabled Bool>
      [max_htlc_mtokens]: <Channel Maximum HTLC Millitokens String>
      min_htlc_mtokens: <Channel Minimum HTLC Millitokens String>
      public_keys: [<Announcing Public Key>, <Target Public Key String>]
      transaction_id: <Channel Transaction Id String>
      transaction_vout: <Channel Transaction Output Index Number>
      updated_at: <Update Received At ISO 8601 Date String>
    }

    @event 'channel_closed'
    {
      capacity: <Channel Capacity Tokens Number>
      close_height: <Channel Close Confirmed Block Height Number>
      id: <Standard Format Channel Id String>
      transaction_id: <Channel Transaction Id String>
      transaction_vout: <Channel Transaction Output Index Number>
      updated_at: <Update Received At ISO 8601 Date String>
    }

    @event 'node_updated'
    {
      alias: <Node Alias String>
      color: <Node Color String>
      public_key: <Node Public Key String>
      [sockets]: [<Network Host And Port String>]
      updated_at: <Update Received At ISO 8601 Date String>
    }

Example:

```node
const {once} = require('events');
const {subscribeToGraph} = require('ln-service');
const sub = subscribeToGraph({lnd});
const [closedChannel] = await once(sub, 'closed_channel');
```

### subscribeToInvoice

Subscribe to an invoice

Lnd built with invoicesrpc tag is required

The `payments` array of HTLCs is only populated on LND versions after 0.7.1

    {
      id: <Invoice Payment Hash Hex String>
      lnd: <Authenticated LND gRPC API Object>
    }

    @throws
    <Error>

    @returns
    <EventEmitter Object>

    @event `invoice_updated`
    {
      chain_address: <Fallback Chain Address String>
      [confirmed_at]: <Settled at ISO 8601 Date String>
      created_at: <ISO 8601 Date String>
      description: <Description String>
      description_hash: <Description Hash Hex String>
      expires_at: <ISO 8601 Date String>
      id: <Payment Hash String>
      [is_canceled]: <Invoice is Canceled Bool>
      is_confirmed: <Invoice is Confirmed Bool>
      [is_held]: <HTLC is Held Bool>
      is_outgoing: <Invoice is Outgoing Bool>
      is_private: <Invoice is Private Bool>
      payments: [{
        [confirmed_at]: <Payment Settled At ISO 8601 Date String>
        created_at: <Payment Held Since ISO 860 Date String>
        created_height: <Payment Held Since Block Height Number>
        in_channel: <Incoming Payment Through Channel Id String>
        is_canceled: <Payment is Canceled Bool>
        is_confirmed: <Payment is Confirmed Bool>
        is_held: <Payment is Held Bool>
        mtokens: <Incoming Payment Millitokens String>
        [pending_index]: <Pending Payment Channel HTLC Index Number>
        tokens: <Payment TOkens Number>
      }]
      received: <Received Tokens Number>
      received_mtokens: <Received Millitokens String>
      request: <Bolt 11 Invoice String>
      routes: [[{
        base_fee_mtokens: <Base Routing Fee In Millitokens Number>
        channel: <Standard Format Channel Id String>
        cltv_delta: <CLTV Blocks Delta Number>
        fee_rate: <Fee Rate In Millitokens Per Million Number>
        public_key: <Public Key Hex String>
      }]]
      secret: <Secret Preimage Hex String>
      tokens: <Tokens Number>
    }

Example:

```node
const {once} = require('events');
const {subscribeToInvoice} = require('ln-service');
const 'invoiceIdHexString';
const sub = subscribeToInvoice({id, lnd});
const [invoice] = await once(sub, 'invoice_updated');
```

### subscribeToInvoices

Subscribe to invoices

The `payments` array of HTLCs is only populated on LND versions after 0.7.1

    {
      lnd: <Authenticated LND gRPC API Object>
    }

    @throws
    <Error>

    @returns
    <EventEmitter Object>

    @event 'invoice_updated'
    {
      [chain_address]: <Fallback Chain Address String>
      cltv_delta: <Final CLTV Delta Number>
      [confirmed_at]: <Confirmed At ISO 8601 Date String>
      created_at: <Created At ISO 8601 Date String>
      description: <Description String>
      description_hash: <Description Hash Hex String>
      expires_at: <Expires At ISO 8601 Date String>
      id: <Invoice Payment Hash Hex String>
      is_confirmed: <Invoice is Confirmed Bool>
      is_outgoing: <Invoice is Outgoing Bool>
      payments: [{
        [confirmed_at]: <Payment Settled At ISO 8601 Date String>
        created_at: <Payment Held Since ISO 860 Date String>
        created_height: <Payment Held Since Block Height Number>
        in_channel: <Incoming Payment Through Channel Id String>
        is_canceled: <Payment is Canceled Bool>
        is_confirmed: <Payment is Confirmed Bool>
        is_held: <Payment is Held Bool>
        mtokens: <Incoming Payment Millitokens String>
        [pending_index]: <Pending Payment Channel HTLC Index Number>
        tokens: <Payment TOkens Number>
      }]
      received: <Received Tokens Number>
      received_mtokens: <Received Millitokens String>
      request: <BOLT 11 Payment Request String>
      secret: <Payment Secret Hex String>
      tokens: <Invoiced Tokens Number>
    }

Example:

```node
const {once} = require('events');
const {subscribeToInvoices} = require('ln-service');
const sub = subscribeToInvoices({lnd});
const [lastUpdatedInvoice] = await once(sub, 'invoice_updated');
```

### subscribeToOpenRequests

Subscribe to inbound channel open requests

Note: LND 0.7.1 and lower do not support interactive channel acceptance.

Note: listening to inbound channel requests will automatically fail all
channel requests after a short delay.

To return to default behavior of accepting all channel requests, remove all
listeners to `channel_request`

    {
      lnd: <Authenticated LND gRPC API Object>
    }

    @throws
    <Error>

    @returns
    <EventEmitter Object>

    @event 'channel_request'
    {
      accept: <Accept Request Function>
      capacity: <Capacity Tokens Number>
      chain: <Chain Id Hex String>
      commit_fee_tokens_per_vbyte: <Commitment Transaction Fee Number>
      csv_delay: <CSV Delay Blocks Number>
      id: <Request Id Hex String>
      local_balance: <Channel Local Tokens Balance Number>
      local_reserve: <Channel Local Reserve Tokens Number>
      max_pending_mtokens: <Maximum Millitokens Pending In Channel String>
      max_pending_payments: <Maximum Pending Payments Number>
      min_chain_output: <Minimum Chain Output Tokens Number>
      min_htlc_mtokens: <Minimum HTLC Millitokens String>
      partner_public_key: <Peer Public Key Hex String>
      reject: <Reject Request Function>
    }

    @event 'error'
    <Error Object>

Example:

```node
const {subscribeToOpenRequests} = require('ln-service');
const sub = subscribeToOpenRequests({lnd});
sub.on('channel_request', channel => {
  // Reject small channels
  return (channel.capacity < 1000000) ? request.reject() : request.accept();
});
```

### subscribeToPastPayment

Subscribe to the status of a past payment

Requires lnd built with routerrpc build tag

    {
      [id]: <Payment Request Hash Hex String>
      lnd: <Authenticated Lnd gRPC API Object>
    }

    @throws
    <Error>

    @returns
    <Subscription EventEmitter Object>

    @event 'confirmed'
    {
      fee_mtokens: <Total Fee Millitokens To Pay String>
      hops: [{
        channel: <Standard Format Channel Id String>
        channel_capacity: <Channel Capacity Tokens Number>
        fee_mtokens: <Fee Millitokens String>
        forward_mtokens: <Forward Millitokens String>
        public_key: <Public Key Hex String>
        timeout: <Timeout Block Height Number>
      }]
      id: <Payment Hash Hex String>
      mtokens: <Total Millitokens To Pay String>
      secret: <Payment Preimage Hex String>
      timeout: <Expiration Block Height Number>
    }

    @event 'failed'
    {
      is_invalid_payment: <Failed Due to Payment Rejected At Destination Bool>
      is_pathfinding_timeout: <Failed Due to Pathfinding Timeout Bool>
      is_route_not_found: <Failed Due to Absence of Path Through Graph Bool>
    }

    @event 'paying'
    {}

Exmple:

```node
const {once} = require('events');
const {subscribeToPastPayment} = require('ln-service');
const id = 'paymentRequestHashHexString';
const sub = subscribeToPastPayment({id, lnd});
const {secret} = await once(sub, 'confirmed');
```

### subscribeToPayViaDetails

Subscribe to the flight of a payment

Requires lnd built with routerrpc build tag

    {
      [cltv_delta]: <Final CLTV Delta Number>
      destination: <Destination Public Key String>
      [id]: <Payment Request Hash Hex String>
      lnd: <Authenticated LND gRPC API Object>
      [max_fee]: <Maximum Fee Tokens To Pay Number>
      [max_timeout_height]: <Maximum Expiration CLTV Timeout Height Number>
      [outgoing_channel]: <Pay Out of Outgoing Channel Id String>
      [pathfinding_timeout]: <Time to Spend Finding a Route Milliseconds Number>
      tokens: <Tokens To Pay Number>
    }

    @throws
    <Error>

    @returns
    <Subscription EventEmitter Object>

    @event 'confirmed'
    {
      fee_mtokens: <Total Fee Millitokens To Pay String>
      hops: [{
        channel: <Standard Format Channel Id String>
        channel_capacity: <Channel Capacity Tokens Number>
        fee_mtokens: <Fee Millitokens String>
        forward_mtokens: <Forward Millitokens String>
        public_key: <Public Key Hex String>
        timeout: <Timeout Block Height Number>
      }]
      [id]: <Payment Hash Hex String>
      mtokens: <Total Millitokens To Pay String>
      secret: <Payment Preimage Hex String>
    }

    @event 'failed'
    {
      is_invalid_payment: <Failed Due to Invalid Payment Bool>
      is_pathfinding_timeout: <Failed Due to Pathfinding Timeout Bool>
      is_route_not_found: <Failed Due to Route Not Found Bool>
    }

    @event 'paying'
    {}

Example:

```node
const {once} = require('events');
const {subscribeToPayViaDetails} = require('ln-service');
const destination = 'destinationNodePublicKeyHexString';
const id = 'paymentRequestHashHexString';
const sub = subscribeToPayViaDetails({destination, id, lnd, tokens: 80085});
const [paid] = await once(sub, 'confirmed');
```

### subscribeToPayViaRequest

Subscribe to the flight of a payment request

Requires lnd built with routerrpc build tag

    {
      lnd: <Authenticated LND gRPC API Object>
      [max_fee]: <Maximum Fee Tokens To Pay Number>
      [outgoing_channel]: <Pay Out of Outgoing Channel Id String>
      [pathfinding_timeout]: <Time to Spend Finding a Route Milliseconds Number>
      request: <BOLT 11 Payment Request String>
      [timeout_height]: <Maximum Expiration CLTV Timeout Height Number>
      [tokens]: <Tokens To Pay Number>
    }

    @throws
    <Error>

    @returns
    <Subscription EventEmitter Object>

    @event 'confirmed'
    {
      fee_mtokens: <Total Fee Millitokens To Pay String>
      hops: [{
        channel: <Standard Format Channel Id String>
        channel_capacity: <Channel Capacity Tokens Number>
        fee_mtokens: <Fee Millitokens String>
        forward_mtokens: <Forward Millitokens String>
        public_key: <Public Key Hex String>
        timeout: <Timeout Block Height Number>
      }]
      id: <Payment Hash Hex String>
      mtokens: <Total Millitokens To Pay String>
      secret: <Payment Preimage Hex String>
      timeout: <Expiration Block Height Number>
    }

    @event 'failed'
    {
      is_invalid_payment: <Failed Due to Invalid Payment Bool>
      is_pathfinding_timeout: <Failed Due to Pathfinding Timeout Bool>
      is_route_not_found: <Failed Due to Route Not Found Bool>
    }

    @event 'paying'
    {}

Example:

```node
const {once} = require('events');
const {subscribeToPayViaRequest} = require('ln-service');
const request = 'bolt11PaymentRequest';
const sub = subscribeToPayViaRequest({lnd, request});
const [paid] = once(sub, 'confirmed');
```

### subscribeToPayViaRoutes

Subscribe to the attempts of paying via specified routes

Requires lnd built with routerrpc build tag

    {
      [id]: <Payment Hash Hex String>
      lnd: <Authenticated LND gRPC API Object>
      [pathfinding_timeout]: <Time to Spend Finding a Route Milliseconds Number>
      routes: [{
        fee: <Total Fee Tokens To Pay Number>
        fee_mtokens: <Total Fee Millitokens To Pay String>
        hops: [{
          channel: <Standard Format Channel Id String>
          channel_capacity: <Channel Capacity Tokens Number>
          fee: <Fee Number>
          fee_mtokens: <Fee Millitokens String>
          forward: <Forward Tokens Number>
          forward_mtokens: <Forward Millitokens String>
          public_key: <Public Key Hex String>
          timeout: <Timeout Block Height Number>
        }]
        mtokens: <Total Millitokens To Pay String>
        timeout: <Expiration Block Height Number>
        tokens: <Total Tokens To Pay Number>
      }]
    }

    @throws
    <Error>

    @returns
    <EventEmitter Object>

    @event 'failure'
    {
      failure: [
        <Code Number>
        <Failure Message String>
        {
          channel: <Standard Format Channel Id String>
          [mtokens]: <Millitokens String>
          [policy]: {
            base_fee_mtokens: <Base Fee Millitokens String>
            cltv_delta: <Locktime Delta Number>
            fee_rate: <Fees Charged Per Million Tokens Number>
            [is_disabled]: <Channel is Disabled Bool>
            max_htlc_mtokens: <Maximum HLTC Millitokens value String>
            min_htlc_mtokens: <Minimum HTLC Millitokens Value String>
          }
          public_key: <Public Key Hex String>
          [update]: {
            chain: <Chain Id Hex String>
            channel_flags: <Channel Flags Number>
            extra_opaque_data: <Extra Opaque Data Hex String>
            message_flags: <Message Flags Number>
            signature: <Channel Update Signature Hex String>
          }
        }
      ]
    }

    @event 'paying'
    {
      route: {
        fee: <Total Fee Tokens To Pay Number>
        fee_mtokens: <Total Fee Millitokens To Pay String>
        hops: [{
          channel: <Standard Format Channel Id String>
          channel_capacity: <Channel Capacity Tokens Number>
          fee: <Fee Number>
          fee_mtokens: <Fee Millitokens String>
          forward: <Forward Tokens Number>
          forward_mtokens: <Forward Millitokens String>
          public_key: <Public Key Hex String>
          timeout: <Timeout Block Height Number>
        }]
        mtokens: <Total Millitokens To Pay String>
        timeout: <Expiration Block Height Number>
        tokens: <Total Tokens To Pay Number>
      }
    }

    @event 'routing_failure'
    {
      [channel]: <Standard Format Channel Id String>
      [index]: <Failure Hop Index Number>
      [mtokens]: <Failure Related Millitokens String>
      [policy]: {
        base_fee_mtokens: <Base Fee Millitokens String>
        cltv_delta: <Locktime Delta Number>
        fee_rate: <Fees Charged Per Million Tokens Number>
        [is_disabled]: <Channel is Disabled Bool>
        max_htlc_mtokens: <Maximum HLTC Millitokens value String>
        min_htlc_mtokens: <Minimum HTLC Millitokens Value String>
      }
      public_key: <Public Key Hex String>
      reason: <Failure Reason String>
      route: {
        fee: <Total Fee Tokens To Pay Number>
        fee_mtokens: <Total Fee Millitokens To Pay String>
        hops: [{
          channel: <Standard Format Channel Id String>
          channel_capacity: <Channel Capacity Tokens Number>
          fee: <Fee Number>
          fee_mtokens: <Fee Millitokens String>
          forward: <Forward Tokens Number>
          forward_mtokens: <Forward Millitokens String>
          public_key: <Public Key Hex String>
          timeout: <Timeout Block Height Number>
        }]
        mtokens: <Total Millitokens To Pay String>
        timeout: <Expiration Block Height Number>
        tokens: <Total Tokens To Pay Number>
      }
      [timeout_height]: <Failure Related CLTV Timeout Height Number>
      [update]: {
        chain: <Chain Id Hex String>
        channel_flags: <Channel Flags Number>
        extra_opaque_data: <Extra Opaque Data Hex String>
        message_flags: <Message Flags Number>
        signature: <Channel Update Signature Hex String>
      }
    }

    @event 'success'
    {
      fee: <Fee Paid Tokens Number>
      fee_mtokens: <Fee Paid Millitokens String>
      hops: [{
        channel: <Standard Format Channel Id String>
        channel_capacity: <Hop Channel Capacity Tokens Number>
        fee_mtokens: <Hop Forward Fee Millitokens String>
        forward_mtokens: <Hop Forwarded Millitokens String>
        timeout: <Hop CLTV Expiry Block Height Number>
      }]
      id: <Payment Hash Hex String>
      is_confirmed: <Is Confirmed Bool>
      is_outgoing: <Is Outoing Bool>
      mtokens: <Total Millitokens Sent String>
      route: {
        fee: <Total Fee Tokens To Pay Number>
        fee_mtokens: <Total Fee Millitokens To Pay String>
        hops: [{
          channel: <Standard Format Channel Id String>
          channel_capacity: <Channel Capacity Tokens Number>
          fee: <Fee Number>
          fee_mtokens: <Fee Millitokens String>
          forward: <Forward Tokens Number>
          forward_mtokens: <Forward Millitokens String>
          public_key: <Public Key Hex String>
          timeout: <Timeout Block Height Number>
        }]
        mtokens: <Total Millitokens To Pay String>
        timeout: <Expiration Block Height Number>
        tokens: <Total Tokens To Pay Number>
      }
      secret: <Payment Secret Preimage Hex String>
      tokens: <Total Tokens Sent Number>
    }

Example:

```node
const {once} = require('events');
const {getRoutes, subscribeToPayViaRoutes} = require('ln-service');
const {routes} = getRoutes({destination, lnd, tokens});
const sub = subscribeToPayViaRoutes({lnd, routes});
const [success] = await once(sub, 'success');
```

### subscribeToProbe

Requires LND built with `routerrpc` build tag

`is_ignoring_past_failures` will turn off LND 0.7.1+ past failure pathfinding

`confidence` is not supported in LND 0.7.1

    {
      [cltv_delta]: <Final CLTV Delta Number>
      destination: <Destination Public Key Hex String>
      [ignore]: [{
        [channel]: <Channel Id String>
        from_public_key: <Public Key Hex String>
        [to_public_key]: <To Public Key Hex String>
      }]
      [is_ignoring_past_failures]: <Ignore Past Failures When Finding Path Bool>
      [is_strict_hints]: <Only Route Through Specified Paths Bool>
      lnd: <Authenticated LND gRPC API Object>
      [max_fee]: <Maximum Fee Tokens Number>
      [max_timeout_height]: <Maximum CLTV Timeout Height>
      [routes]: [[{
        [base_fee_mtokens]: <Base Routing Fee In Millitokens Number>
        [channel_capacity]: <Channel Capacity Tokens Number>
        [channel]: <Standard Format Channel Id String>
        [cltv_delta]: <CLTV Blocks Delta Number>
        [fee_rate]: <Fee Rate In Millitokens Per Million Number>
        public_key: <Forward Edge Public Key Hex String>
      }]]
      tokens: <Tokens Number>
    }

    @returns
    <Probe Subscription Event Emitter Object>

    @event 'error'
    [<Failure Code Number>, <Failure Message String>]

    @event 'probe_success'
    {
      route: {
        [confidence]: <Route Confidence Score Out Of One Million Number>
        fee: <Total Fee Tokens To Pay Number>
        fee_mtokens: <Total Fee Millitokens To Pay String>
        hops: [{
          channel: <Standard Format Channel Id String>
          channel_capacity: <Channel Capacity Tokens Number>
          fee: <Fee Number>
          fee_mtokens: <Fee Millitokens String>
          forward: <Forward Tokens Number>
          forward_mtokens: <Forward Millitokens String>
          public_key: <Public Key Hex String>
          timeout: <Timeout Block Height Number>
        }]
        mtokens: <Total Millitokens To Pay String>
        timeout: <Expiration Block Height Number>
        tokens: <Total Tokens To Pay Number>
      }
    }

    @event 'probing'
    {
      route: {
        fee: <Total Fee Tokens To Pay Number>
        fee_mtokens: <Total Fee Millitokens To Pay String>
        hops: [{
          channel: <Standard Format Channel Id String>
          channel_capacity: <Channel Capacity Tokens Number>
          fee: <Fee Number>
          fee_mtokens: <Fee Millitokens String>
          forward: <Forward Tokens Number>
          forward_mtokens: <Forward Millitokens String>
          public_key: <Public Key Hex String>
          timeout: <Timeout Block Height Number>
        }]
        mtokens: <Total Millitokens To Pay String>
        timeout: <Expiration Block Height Number>
        tokens: <Total Tokens To Pay Number>
      }
    }

    @event 'routing_failure'
    {
      [channel]: <Standard Format Channel Id String>
      [mtokens]: <Millitokens String>
      [policy]: {
        base_fee_mtokens: <Base Fee Millitokens String>
        cltv_delta: <Locktime Delta Number>
        fee_rate: <Fees Charged Per Million Tokens Number>
        [is_disabled]: <Channel is Disabled Bool>
        max_htlc_mtokens: <Maximum HLTC Millitokens value String>
        min_htlc_mtokens: <Minimum HTLC Millitokens Value String>
      }
      public_key: <Public Key Hex String>
      reason: <Failure Reason String>
      route: {
        fee: <Total Fee Tokens To Pay Number>
        fee_mtokens: <Total Fee Millitokens To Pay String>
        hops: [{
          channel: <Standard Format Channel Id String>
          channel_capacity: <Channel Capacity Tokens Number>
          fee: <Fee Number>
          fee_mtokens: <Fee Millitokens String>
          forward: <Forward Tokens Number>
          forward_mtokens: <Forward Millitokens String>
          public_key: <Public Key Hex String>
          timeout: <Timeout Block Height Number>
        }]
        mtokens: <Total Millitokens To Pay String>
        timeout: <Expiration Block Height Number>
        tokens: <Total Tokens To Pay Number>
      }
      [update]: {
        chain: <Chain Id Hex String>
        channel_flags: <Channel Flags Number>
        extra_opaque_data: <Extra Opaque Data Hex String>
        message_flags: <Message Flags Number>
        signature: <Channel Update Signature Hex String>
      }
    }

Example:

```node
const {once} = require('events');
const {subscribeToProbe} = require('ln-service');
const destination = 'destinationPublicKeyHexString';
const sub = subscribeToProbe({destination, lnd, tokens: 80085});
const [{route}] = await once(sub, 'probe_success');
```

### subscribeToTransactions

Subscribe to transactions

    {
      lnd: <Authenticated LND gRPC API Object>
    }

    @throws
    <Error>

    @returns
    <EventEmitter Object>

    @event 'chain_transaction'
    {
      [block_id]: <Block Hash String>
      confirmation_count: <Confirmation Count Number>
      [confirmation_height]: <Block Best Chain Tip Height Number>
      fee: <Fees Paid Tokens Number>
      id: <Transaction Id String>
      is_confirmed: <Is Confirmed Bool>
      is_outgoing: <Transaction Outbound Bool>
      [output_addresses]: [<Chain Address String>]
      tokens: <Tokens Number>
    }

Example:

```node
const {subscribeToTransactions} = require('ln-service');
let lastChainTransactionId;
const sub = subscribeToTransactions({lnd});
sub.on('chain_transaction', tx => lastChainTransactionId = tx.id);
```

### unauthenticatedLndGrpc

Unauthenticated gRPC interface to the Lightning Network Daemon (lnd).

Make sure to provide a cert when using LND with its default self-signed cert

    {
      [cert]: <Base64 or Hex Serialized LND TLS Cert>
      [socket]: <Host:Port String>
    }

    @throws
    <Error>

    @returns
    {
      lnd: {
        unlocker: <Unlocker LND GRPC Api Object>
      }
    }

Example:

```node
const {createSeed, unauthenticatedLndGrpc} = require('ln-service');
const {lnd} = unauthenticatedLndGrpc({});
const {seed} = await createSeed({lnd});
```

### unlockWallet

Unlock the wallet

    {
      lnd: <Unauthenticated LND gRPC API Object>
      password: <Wallet Password String>
    }

    @returns via cbk or Promise

Example:

```node
const {unauthenticatedLndGrpc, unlockWallet} = require('ln-service');
const {lnd} = unauthenticatedLndGrpc({});
await unlockWallet({lnd, password: 'walletSecretPassword'});
```

### updateConnectedWatchtower

Update a watchtower

Requires LND built with wtclientrpc build tag

    {
      [add_socket]: <Add Socket String>
      lnd: <Authenticated LND gRPC API Object>
      public_key: <Watchtower Public Key Hex String>
      [remove_socket]: <Remove Socket String>
    }

    @returns via cbk or Promise

Example:

```node
const {updateConnectedWatchtower} = require('ln-service');

await updateConnectedWatchtower({
  lnd,
  add_socket: additionalWatchtowerNetworkAddress,
  public_key: watchtowerPublicKey,
});
```

### updateRoutingFees

Update routing fees on a single channel or on all channels

Updating the maximum htlc size is not supported on LND 0.7.1 and below

    {
      [base_fee_tokens]: <Base Fee Tokens Charged Number>
      [cltv_delta]: <HTLC CLTV Delta Number>
      [fee_rate]: <Fee Rate In Millitokens Per Million Number>
      lnd: <Authenticated LND gRPC API Object>
      [max_htlc_mtokens]: <Maximum HTLC Mtokens to Forward String>
      [transaction_id]: <Channel Funding Transaction Id String>
      [transaction_vout]: <Channel Funding Transaction Output Index Number>
    }

    @returns via cbk or Promise

Example:

```node
const {updateRoutingFees} = require('lnd');
await updateRoutingFees({lnd, fee_rate: 2500});
```

### verifyBackup

Verify a channel backup

    {
      backup: <Individual Channel Backup Hex String>
      lnd: <Authenticated LND gRPC API Object>
    }

    @returns via cbk or Promise
    {
      [err]: <LND Error Object>
      is_valid: <Backup is Valid Bool>
    }

Example:

```node
const {getBackups, verifyBackup} = require('ln-service');
const [channelBackup] = (await getBackups({lnd})).channels;

const isValid = (await verifyBackup({lnd, backup: channelBackup.backup})).is_valid;
```

### verifyBackups

Verify a set of aggregated channel backups

    {
      backup: <Multi-Backup Hex String>
      channels: [{
        transaction_id: <Funding Transaction Id Hex String>
        transaction_vout: <Funding Transaction Output Index Number>
      }]
      lnd: <Authenticated LND gRPC API Object>
    }

    @returns via cbk or Promise
    {
      is_valid: <Backup is Valid Bool>
    }

Example:

```node
const {getBackups, verifyBackups} = require('ln-service');
const {backup, channels} = await getBackups({lnd});
const isValid = (await verifyBackups({backup, channels, lnd})).is_valid;
```

### verifyMessage

Verify a message was signed by a known pubkey

    {
      lnd: <Authenticated LND gRPC API Object>
      message: <Message String>
      signature: <Signature Hex String>
    }

    @returns via cbk or Promise
    {
      signed_by: <Public Key Hex String>
    }

Example:

```node
const {verifyMessage} = require('ln-service');
const message = 'foo';
const signature = 'badSignature';
const signedBy = (await verifyMessage({lnd, message, signature})).signed_by;
```

## Using as a Stand-Alone REST API Server

    git clone https://github.com/alexbosworth/ln-service.git
    cd ln-service
    npm install

### Configure

In REST mode:

For convenience in REST mode, you can make a `.env` file with `KEY=VALUE` pairs
instead of setting environment variables.

Environment variables:

    export GRPC_SSL_CIPHER_SUITES="HIGH+ECDSA"
    export LNSERVICE_CHAIN="bitcoin" // or litecoin
    export LNSERVICE_LND_DIR="/PATH/TO/.lnd/"
    export LNSERVICE_NETWORK="testnet" // or mainnet
    export LNSERVICE_SECRET_KEY="REPLACE!WITH!SECRET!KEY!"

.env file:
    
    GRPC_SSL_CIPHER_SUITES='HIGH+ECDSA'
    LNSERVICE_CHAIN='bitcoin'
    LNSERVICE_LND_DIR='/PATH/TO/.lnd/'
    LNSERVICE_NETWORK='testnet'
    LNSERVICE_SECRET_KEY='REPLACE!WITH!SECRET!KEY!'
    
Setting environment variables in Linux:

- Edit `.bashrc` or `~/.profile`
- `$ source ~/.bashrc` in the window you are running the service from

Setting environment variables in MacOS:

- Edit `~/.bash_profile`
- `$ . ~/.bash_profile` in the window you are running the service from

Run the service:

    npm start

### REST API

Authentication is with Basic Authentication.  Make sure that the request has an
authorization header that contains Base64 encoded credentials.

    Authorization: Basic {{TOKEN_GOES_HERE_WITHOUT_BRACES}}

To generate the Base64 encoded credentials in Chrome for example in the console
you can:

    > let username = 'test';
    // username can be anything.
    > let password = '1m5secret4F';
    // password must match the LNSERVICE_SECRET_KEY in your env variables.
    > btoa(`${username}:${password}`);
    // dGVzdDoxbTVlY3JldDRG

And then set the value of the Authorization header to the returned value
`dGVzdDoxbTVlY3JldDRG`.

Copy the result as the token in the above example.

## Tests

Unit tests:

    $ npm test

Integration tests:

btcd and lnd are required to execute the integration tests.

Lnd must be compiled with the sub-rpc tags to complete all tests.

    $ npm run all-integration-tests

