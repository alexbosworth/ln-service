# Lightning Network Service

[![npm version](https://badge.fury.io/js/ln-service.svg)](https://badge.fury.io/js/ln-service)
[![Coverage Status](https://coveralls.io/repos/github/alexbosworth/ln-service/badge.svg?branch=master)](https://coveralls.io/github/alexbosworth/ln-service?branch=master)
[![Build Status](https://travis-ci.org/alexbosworth/ln-service.svg?branch=master)](https://travis-ci.org/alexbosworth/ln-service)

## Overview

The core of this project is a gRPC interface for node.js projects, available
through npm.

Supported LND versions:

- v0.11.0-beta to v0.11.1-beta

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

To use authenticated methods you will need to provide LND credentials.

To export the credentials via a command, you can install
[balanceofsatoshis](https://github.com/alexbosworth/balanceofsatoshis):
`npm install -g balanceofsatoshis` and export via `bos credentials --cleartext`

Or you can export them manually:

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
- [cancelPendingChannel](#cancelPendingChannel) - Cancel a pending open channel
- [changePassword](#changePassword) - Change the wallet unlock password
- [closeChannel](#closeChannel) - Terminate an open channel
- [connectWatchtower](#connectWatchtower) - Connect a watchtower
- [createChainAddress](#createChainAddress) - Get a chain address to receive at
- [createHodlInvoice](#createHodlInvoice) - Make a HODL HTLC invoice
- [createInvoice](#createInvoice) - Make a regular invoice
- [createSeed](#createSeed) - Generate a wallet seed for a new wallet
- [createSignedRequest](#createSignedRequest) - create a signed payment request
- [createUnsignedRequest](#createUnsignedRequest) - create an unsigned invoice
- [createWallet](#createWallet) - Make a new wallet
- [decodePaymentRequest](#decodePaymentRequest) - Decode a Lightning invoice
- [deleteForwardingReputations](#deleteForwardingReputations) - Wipe node reps
- [deletePayments](#deletePayments) - Delete entire history of past payments
- [diffieHellmanComputeSecret](#diffieHellmanComputeSecret) - Get DH shared key
- [disconnectWatchtower](#disconnectWatchtower) - Disconnect a watchtower
- [fundPendingChannels](#fundPendingChannels) - Fund pending open channels
- [fundPsbt](#fundPsbt) - Create an unsigned PSBT with funding inputs and spending outputs
- [getAccessIds](#getAccessIds) - Get granted macaroon root access ids
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
- [getHeight](#getHeight) - Get the current best chain height and block hash
- [getIdentity](#getIdentity) - Get the node's identity key
- [getInvoice](#getInvoice) - Get a previously created invoice
- [getInvoices](#getInvoices) - Get all previously created invoice
- [getMethods](#getMethods) - Get available methods and associated permissions
- [getNetworkCentrality](#getNetworkCentrality) - Get centrality score for nodes
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
- [getRouteThroughHops](#getRouteThroughHops) - Get a route through nodes
- [getRouteToDestination](#getRouteToDestination) - Get a route to a destination
- [getSweepTransactions](#getSweepTransactions) - Get transactions sweeping to self
- [getTowerServerInfo](#getTowerServerInfo) - Get information about tower server
- [getUtxos](#getUtxos) - Get on-chain unspent outputs
- [getWalletInfo](#getWalletInfo) - Get general wallet info
- [getWalletVersion](#getWalletVersion) - Get the build and version of the LND
- [grantAccess](#grantAccess) - Grant an access credential macaroon
- [grpcProxyServer](#grpcProxyServer) - REST proxy server for calling to gRPC
- [isDestinationPayable](#isDestinationPayable) - Check can pay to destination
- [lockUtxo](#lockUtxo) - Lock a UTXO temporarily to prevent it being used
- [openChannel](#openChannel) - Open a new channel
- [openChannels](#openChannels) - Open channels with external funding
- [parsePaymentRequest](#parsePaymentRequest) - Parse a BOLT11 Payment Request
- [pay](#pay) - Send a payment
- [payViaPaymentDetails](#payViaPaymentDetails) - Pay using decomposed details
- [payViaPaymentRequest](#payViaPaymentRequest) - Pay using a payment request
- [payViaRoutes](#payViaRoutes) - Make a payment over specified routes
- [prepareForChannelProposal](#prepareForChannelProposal) - setup for a channel proposal
- [probe](#probe) - Find a payable route by attempting a fake payment
- [probeForRoute](#probeForRoute) - Actively probe to find a payable route
- [proposeChannel](#proposeChannel) - Offer a channel proposal to a peer
- [recoverFundsFromChannel](#recoverFundsFromChannel) - Restore a channel
- [recoverFundsFromChannels](#recoverFundsFromChannels) - Restore all channels
- [removePeer](#removePeer) - Disconnect from a connected peer
- [restrictMacaroon](#restrictMacaroon) - Add limitations to a macaroon
- [revokeAccess](#revokeAccess) - Revoke all access macaroons given to an id
- [routeFromChannels](#routeFromChannels) - Convert channel series to a route
- [sendToChainAddress](#sendToChainAddress) - Send on-chain to an address
- [sendToChainAddresses](#sendToChainAddresses) - Send on-chain to addresses
- [setAutopilot](#setAutopilot) - Turn autopilot on and set autopilot scores
- [settleHodlInvoice](#settleHodlInvoice) - Accept a HODL HTLC invoice
- [signBytes](#signBytes) -  Sign over arbitrary bytes with node keys
- [signMessage](#signMessage) - Sign a message with the node identity key
- [signPsbt](#signPsbt) - Sign and finalize an unsigned PSBT using internal keys
- [signTransaction](#signTransaction) - Sign an on-chain transaction
- [stopDaemon](#stopDaemon) - Stop lnd
- [subscribeToBackups](#subscribeToBackups) - Subscribe to channel backups
- [subscribeToBlocks](#subscribeToBlocks) - Subscribe to on-chain blocks
- [subscribeToChainAddress](#subscribeToChainAddress) - Subscribe to receives
- [subscribeToChainSpend](#subscribeToChainSpend) - Subscribe to chain spends
- [subscribeToChannels](#subscribeToChannels) - Subscribe to channel statuses
- [subscribeToForwardRequests](#subscribeToForwardRequests) - Interactive route 
- [subscribeToForwards](#subscribeToForwards) - Subscribe to HTLC events
- [subscribeToGraph](#subscribeToGraph) - Subscribe to network graph updates
- [subscribeToInvoice](#subscribeToInvoice) - Subscribe to invoice updates
- [subscribeToInvoices](#subscribeToInvoices) - Subscribe to all invoices
- [subscribeToOpenRequests](#subscribeToOpenRequests) - Approve open requests
- [subscribeToPastPayment](#subscribeToPastPayment) - Subscribe to a payment
- [subscribeToPayViaDetails](#subscribeToPayViaDetails) - Pay using details
- [subscribeToPayViaRequest](#subscribeToPayViaRequest) - Pay using a request
- [subscribeToPayViaRoutes](#subscribeToPayViaRoutes) - Pay using routes
- [subscribeToPeers](#subscribeToPeers) - Subscribe to peers connectivity
- [subscribeToProbe](#subscribeToProbe) - Subscribe to a probe for a route
- [subscribeToProbeForRoute](#subscribeToProbeForRoute) - Probe for a route
- [subscribeToTransactions](#subscribeToTransactions) - Subscribe to chain tx
- [unauthenticatedLndGrpc](#unauthenticatedLndGrpc) - LND for locked lnd APIs
- [unlockUtxo](#unlockUtxo) - Release a locked UTXO so that it can be used again
- [unlockWallet](#unlockWallet) - Unlock a locked lnd
- [updateChainTransaction](#updateChainTransaction) - Update a chain transaction
- [updateConnectedWatchtower](#updateConnectedWatchtower) - Update watchtower
- [updateRoutingFees](#updateRoutingFees) - Change routing fees
- [verifyBackup](#verifyBackup) - Verify a channel backup
- [verifyBackups](#verifyBackups) - Verify a set of channel backups
- [verifyBytesSignature](#verifyBytesSignature) - Verify a signature over bytes
- [verifyMessage](#verifyMessage) - Verify a message signed by a node identity

## Additional Libraries

- [bolt03](https://npmjs.com/package/bolt03) - bolt03 transaction utilities
- [bolt07](https://npmjs.com/package/bolt07) - bolt07 channel gossip utilities
- [bolt09](https://npmjs.com/package/bolt09) - bolt09 feature flag utilities
- [invoices](https://npmjs.com/package/invoices) - bolt11 request utilities
- [lightning](https://npmjs.com/package/lightning) - general lightning utilities
- [ln-accounting](https://npmjs.com/package/ln-accounting) - accounting records
- [probing](https://npmjs.com/package/probing) - payment probing utilities
- [psbt](https://www.npmjs.com/package/psbt) - BIP 174 PSBT utilities

### addPeer

Add a peer if possible (not self, or already connected)

Requires `peers:write` permission

`timeout` is not supported in LND 0.11.1 and below

    {
      [is_temporary]: <Add Peer as Temporary Peer Bool> // Default: false
      lnd: <Authenticated LND API Object>
      public_key: <Public Key Hex String>
      [retry_count]: <Retry Count Number>
      [retry_delay]: <Delay Retry By Milliseconds Number>
      socket: <Host Network Address And Optional Port String> // ip:port
      [timeout]: <Connection Attempt Timeout Milliseconds Number>
    }

    @returns via cbk or Promise

Example:

```node
const {addPeer} = require('ln-service');
const socket = hostIp + ':' + portNumber;
await addPeer({lnd, socket, public_key: publicKeyHexString});
```

### authenticatedLndGrpc

Initiate a gRPC API Methods Object for authenticated methods

Both the cert and macaroon expect the entire serialized LND generated file

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
        autopilot: <Autopilot API Methods Object>
        chain: <ChainNotifier API Methods Object>
        default: <Default API Methods Object>
        invoices: <Invoices API Methods Object>
        router: <Router API Methods Object>
        signer: <Signer Methods API Object>
        tower_client: <Watchtower Client Methods Object>
        tower_server: <Watchtower Server Methods API Object>
        wallet: <WalletKit gRPC Methods API Object>
        version: <Version Methods API Object>
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

Requires LND built with `walletrpc` tag

    {
      [description]: <Transaction Label String>
      lnd: <Authenticated LND API Object>
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
const {calculateHops, getNetworkGraph, getIdentity} = require('ln-service');
const {channels} = await getNetworkGraph;
const end = 'destinationPublicKeyHexString';
const start = (await getIdentity({lnd})).public_key;_
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
const {calculatePaths, getNetworkGraph, getIdentity} = require('ln-service');
const {channels} = await getNetworkGraph;
const end = 'destinationPublicKeyHexString';
const start = (await getIdentity({lnd})).public_key;
const const {paths} = calculatePaths({channels, end, start, mtokens: '1000'});
```

### cancelHodlInvoice

Cancel an invoice

  This call can cancel both HODL invoices and also void regular invoices

  Requires LND built with `invoicesrpc`

  Requires `invoices:write` permission

    {
      id: <Payment Preimage Hash Hex String>
      lnd: <Authenticated RPC LND API Object>
    }

Example:

```node
const {cancelHodlInvoice} = require('ln-service');
const id = paymentRequestPreimageHashHexString;
const await cancelHodlInvoice({id, lnd});
```

### cancelPendingChannel

Cancel an external funding pending channel

    {
      id: <Pending Channel Id Hex String>
      lnd: <Authenticated LND API Object>
    }

    @returns via cbk or Promise

Example:
```node
const {cancelPendingChannel, openChannels} = require('ln-service');

const channelsToOpen = [{capacity: 1e6, partner_public_key: publicKey}];

const {pending} = await openChannels({lnd, channels: channelsToOpen});

const [id] = pending;

// Cancel the pending channel open request
await cancelPendingChannel({id, lnd});
```

### changePassword

Change wallet password

Requires locked LND and unauthenticated LND connection

    {
      current_password: <Current Password String>
      lnd: <Unauthenticated LND API Object>
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

Requires `info:read`, `offchain:write`, `onchain:write`, `peers:write` permissions

    {
      [address]: <Request Sending Local Channel Funds To Address String>
      [id]: <Standard Format Channel Id String>
      [is_force_close]: <Is Force Close Bool>
      lnd: <Authenticated LND API Object>
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

This method requires LND built with `wtclientrpc` build tag

Requires `offchain:write` permission

    {
      lnd: <Authenticated LND API Object>
      public_key: <Watchtower Public Key Hex String>
      socket: <Network Socket Address IP:PORT String>
    }

Example:

```node
const {connectWatchtower, getTowerServerInfo} = require('ln-service');

const {tower} = await getTowerServerInfo({lnd: towerServerLnd});

const [socket] = tower.sockets;

await connectWatchtower({lnd, socket, public_key: tower.public_key});
```

### createChainAddress

Create a new receive address.

Requires `address:write` permission

    {
      format: <Receive Address Type String> // "np2wpkh" || "p2wpkh"
      [is_unused]: <Get As-Yet Unused Address Bool>
      lnd: <Authenticated LND API Object>
    }

Example:

```node
const {createChainAddress} = require('ln-service');
const format = 'p2wpkh';
const {address} = await createChainAddress({format, lnd});
```

### createHodlInvoice

Create HODL invoice. This invoice will not settle automatically when an
HTLC arrives. It must be settled separately with the secret preimage.

Warning: make sure to cancel the created invoice before its CLTV timeout.

Requires LND built with `invoicesrpc` tag

Requires `address:write`, `invoices:write` permission

    {
      [cltv_delta]: <Final CLTV Delta Number>
      [description]: <Invoice Description String>
      [description_hash]: <Hashed Description of Payment Hex String>
      [expires_at]: <Expires At ISO 8601 Date String>
      [id]: <Payment Hash Hex String>
      [is_fallback_included]: <Is Fallback Address Included Bool>
      [is_fallback_nested]: <Is Fallback Address Nested Bool>
      [is_including_private_channels]: <Invoice Includes Private Channels Bool>
      lnd: <Authenticated LND API Object>
      [mtokens]: <Millitokens String>
      [tokens]: <Tokens Number>
    }

    @returns via cbk or Promise
    {
      [chain_address]: <Backup Address String>
      created_at: <ISO 8601 Date String>
      description: <Description String>
      id: <Payment Hash Hex String>
      mtokens: <Millitokens Number>
      request: <BOLT 11 Encoded Payment Request String>
      [secret]: <Hex Encoded Payment Secret String>
      tokens: <Tokens Number>
    }

Example:

```node
const {createHash, randomBytes} = require('crypto');
const {createHodlInvoice, settleHodlInvoice} = require('ln-service');
const {subscribeToInvoice} = require('ln-service');

const randomSecret = () => randomBytes(32);
const sha256 = buffer => createHash('sha256').update(buffer).digest('hex');

// Choose an r_hash for this invoice, a single sha256, on say randomBytes(32)
const secret = randomSecret();

const id = sha256(secret);

// Supply an authenticatedLndGrpc object for an lnd built with invoicesrpc tag
const {request} = await createHodlInvoice({id, lnd});

// Share the request with the payer and wait for a payment
const sub = subscribeToInvoice({id, lnd});

sub.on('invoice_updated', async invoice => {
  // Only actively held invoices can be settled
  if (!invoice.is_held) {
    return;
  }

  // Use the secret to claim the funds
  await settleHodlInvoice({lnd, secret: secret.toString('hex')});
});
```

### createInvoice

Create a Lightning invoice.

Requires `address:write`, `invoices:write` permission

    {
      [cltv_delta]: <CLTV Delta Number>
      [description]: <Invoice Description String>
      [description_hash]: <Hashed Description of Payment Hex String>
      [expires_at]: <Expires At ISO 8601 Date String>
      [is_fallback_included]: <Is Fallback Address Included Bool>
      [is_fallback_nested]: <Is Fallback Address Nested Bool>
      [is_including_private_channels]: <Invoice Includes Private Channels Bool>
      lnd: <Authenticated LND API Object>
      [secret]: <Payment Preimage Hex String>
      [mtokens]: <Millitokens String>
      [tokens]: <Tokens Number>
    }

    @returns via cbk or Promise
    {
      [chain_address]: <Backup Address String>
      created_at: <ISO 8601 Date String>
      [description]: <Description String>
      id: <Payment Hash Hex String>
      [mtokens]: <Millitokens String>
      request: <BOLT 11 Encoded Payment Request String>
      secret: <Hex Encoded Payment Secret String>
      [tokens]: <Tokens Number>
    }

Example:

```node
const {createInvoice} = require('ln-service');

// Create a zero value invoice
const invoice = await createInvoice({lnd});
```

### createSeed

Create a wallet seed

Requires unlocked lnd and unauthenticated LND API Object

    {
      lnd: <Unauthenticated LND API Object>
      [passphrase]: <Seed Passphrase String>
    }

    @returns via cbk or Promise
    {
      seed: <Cipher Seed Mnemonic String>
    }

Example:

```node
const {createSeed, createWallet} = require('ln-service');
const {seed} = await createSeed({lnd});

// Use the seed to create a wallet
await createWallet({lnd, seed, password: '123456'});
```

### createSignedRequest

Assemble a signed payment request

    {
      destination: <Destination Public Key Hex String>
      hrp: <Request Human Readable Part String>
      signature: <Request Hash Signature Hex String>
      tags: [<Request Tag Word Number>]
    }

    @throws
    <Error>

    @returns
    {
      request: <BOLT 11 Encoded Payment Request String>
    }

Example:

```node
const {createSignedRequest} = require('ln-service');

// Get hrp and signature from createUnsignedRequest
// Get signature via standard private key signing, or LND signBytes
const {request} = createSignedRequest({
  destination: nodePublicKey,
  hrp: amountAndNetworkHrp,
  signature: signedPreimageHash,
  tags: paymentRequestTags,
});
```

### createUnsignedRequest

Create an unsigned payment request

    {
      [chain_addresses]: [<Chain Address String>]
      [cltv_delta]: <CLTV Delta Number>
      [created_at]: <Invoice Creation Date ISO 8601 String>
      [description]: <Description String>
      [description_hash]: <Description Hash Hex String>
      destination: <Public Key String>
      [expires_at]: <ISO 8601 Date String>
      features: [{
        bit: <BOLT 09 Feature Bit Number>
      }]
      id: <Preimage SHA256 Hash Hex String>
      [mtokens]: <Requested Milli-Tokens Value String> (can exceed Number limit)
      network: <Network Name String>
      [payment]: <Payment Identifier Hex String>
      [routes]: [[{
        [base_fee_mtokens]: <Base Fee Millitokens String>
        [channel]: <Standard Format Channel Id String>
        [cltv_delta]: <Final CLTV Expiration Blocks Delta Number>
        [fee_rate]: <Fees Charged in Millitokens Per Million Number>
        public_key: <Forward Edge Public Key Hex String>
      }]]
      [tokens]: <Requested Chain Tokens Number> (note: can differ from mtokens)
    }

    @returns
    {
      hash: <Payment Request Signature Hash Hex String>
      hrp: <Human Readable Part of Payment Request String>
      preimage: <Signature Hash Preimage Hex String>
      tags: [<Data Tag Number>]
    }

Example:

```node
const {createUnsignedRequest} = require('ln-service');

const unsignedComponents = createUnsignedRequest({
  destination: nodePublicKey,
  id: rHashHexString,
  network: 'bitcoin',
});
// Use createSignedRequest and a signature to create a complete request
```

### createWallet

Create a wallet

Requires unlocked lnd and unauthenticated LND API Object

    {
      lnd: <Unauthenticated LND API Object>
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

Requires `offchain:read` permission

    {
      lnd: <Authenticated LND API Object>
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
      features: [{
        bit: <BOLT 09 Feature Bit Number>
        is_known: <Feature is Known Bool>
        is_required: <Feature Support is Required To Pay Bool>
        type: <Feature Type String>
      }]
      id: <Payment Hash String>
      mtokens: <Requested Millitokens String>
      [payment]: <Payment Identifier Hex Encoded String>
      routes: [[{
        [base_fee_mtokens]: <Base Routing Fee In Millitokens String>
        [channel]: <Standard Format Channel Id String>
        [cltv_delta]: <CLTV Blocks Delta Number>
        [fee_rate]: <Fee Rate In Millitokens Per Million Number>
        public_key: <Forward Edge Public Key Hex String>
      }]]
      safe_tokens: <Requested Tokens Rounded Up Number>
      tokens: <Requested Tokens Rounded Down Number>
    }

Example:

```node
const {decodePaymentRequest} = require('ln-service');
const request = 'bolt11EncodedPaymentRequestString';
const details = await decodePaymentRequest({lnd, request});
```

### deleteForwardingReputations

Delete all forwarding reputations

Requires `offchain:write` permission

    {
      lnd: <Authenticated LND API Object>
    }

    @returns via cbk or Promise

Example:

```node
const {deleteForwardingReputations} = require('ln-service');

// Delete all routing reputations to clear pathfinding memory
await deleteForwardingReputations({});
```

### deletePayments

Delete all records of payments

Requires `offchain:write` permission

    {
      lnd: <Authenticated LND API Object>
    }

    @returns via cbk or Promise

Example:

```node
const {deletePayments} = require('ln-service');

// Eliminate all the records of past payments
await deletePayments({lnd});
```

### diffieHellmanComputeSecret

Derive a shared secret

Key family and key index default to 6 and 0, which is the node identity key

Requires LND built with `signerrpc` build tag

Requires `signer:generate` permission

    {
      [key_family]: <Key Family Number>
      [key_index]: <Key Index Number>
      lnd: <Authenticated LND API Object>
      partner_public_key: <Public Key Hex String>
    }

    @returns via cbk or Promise
    {
      secret: <Shared Secret Hex String>
    }

### disconnectWatchtower

Disconnect a watchtower

Requires LND built with `wtclientrpc` build tag

Requires `offchain:write` permission

    {
      lnd: <Authenticated LND API Object>
      public_key: <Watchtower Public Key Hex String>
    }

    @returns via cbk or Promise

```node
const {disconnectWatchtower, getConnectedWatchtowers} = require('ln-service');

const [tower] = (await getConnectedWatchtowers({lnd})).towers;

await disconnectWatchtower({lnd, public_key: tower.public_key});
```

### fundPendingChannels

Fund pending channels

Requires `offchain:write`, `onchain:write` permissions

    {
      channels: [<Pending Channel Id Hex String>]
      funding: <Signed Funding Transaction PSBT Hex String>
      lnd: <Authenticated LND API Object>
    }

    @returns via cbk or Promise

```node
const {fundPendingChannels, openChannels} = require('ln-service');

const channelsToOpen = [{capacity: 1e6, partner_public_key: publicKey}];

const {pending} = await openChannels({lnd, channel: channelsToOpen});

const channels = pending.map(n => n.id);

// Fund the pending open channels request
await fundPendingChannels({channels, lnd, funding: psbt});
```

### fundPsbt

Lock and optionally select inputs to a partially signed transaction

Specify outputs or PSBT with the outputs encoded

If there are no inputs passed, internal UTXOs will be selected and locked

Requires `onchain:write` permission

Requires LND built with `walletrpc` tag

This method is not supported in LND 0.11.1 and below

    {
      [fee_tokens_per_vbyte]: <Chain Fee Tokens Per Virtual Byte Number>
      [inputs]: [{
        transaction_id: <Unspent Transaction Id Hex String>
        transaction_vout: <Unspent Transaction Output Index Number>
      }]
      lnd: <Authenticated LND API Object>
      [outputs]: [{
        address: <Chain Address String>
        tokens: <Send Tokens Tokens Number>
      }]
      [target_confirmations]: <Confirmations To Wait Number>
      [psbt]: <Existing PSBT Hex String>
    }

    @returns via cbk or Promise
    {
      inputs: [{
        [lock_expires_at]: <UTXO Lock Expires At ISO 8601 Date String>
        [lock_id]: <UTXO Lock Id Hex String>
        transaction_id: <Unspent Transaction Id Hex String>
        transaction_vout: <Unspent Transaction Output Index Number>
      }]
      outputs: [{
        is_change: <Spends To a Generated Change Output Bool>
        output_script: <Output Script Hex String>
        tokens: <Send Tokens Tokens Number>
      }]
      psbt: <Unsigned PSBT Hex String>
    }

Example:

```node
const {fundPsbt} = require('ln-service');

const address = 'chainAddress';
const tokens = 1000000;

// Create an unsigned PSBT that sends 1mm to a chain address
const {psbt} = await fundPsbt({lnd, outputs: [{address, tokens}]});

// This PSBT can be used with signPsbt to sign and finalize for broadcast
```

### getAccessIds

Get outstanding access ids given out

Note: this method is not supported in LND versions 0.11.1 and below

Requires `macaroon:read` permission

    {
      lnd: <Authenticated LND API Object>
    }

    @returns via cbk or Promise
    {
      ids: [<Root Access Id Number>]
    }

Example:

```node
const {getAccessIds, grantAccess} = require('ln-service');

// Create a macaroon that can be used to make off-chain payments
const {macaroon} = await grantAccess({lnd, id: '1', is_ok_to_pay: true});

// Get outstanding ids
const {ids} = await getAccessIds({lnd});

// The specified id '1' will appear in the ids array
```

### getAutopilot

Get Autopilot status

Optionally, get the score of nodes as considered by the autopilot.
Local scores reflect an internal scoring that includes local channel info

Permission `info:read` is required

    {
      lnd: <Authenticated LND Object>
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

Requires `offchain:read` permission

    {
      lnd: <Authenticated LND API Object>
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

Requires `offchain:read` permission

    {
      lnd: <Authenticated LND API Object>
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

Requires `onchain:read` permission

    {
      lnd: <Authenticated LND API Object>
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

Requires `onchain:read` permission

    {
      lnd: <Authenticated LND API Object>
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
const {fee} = await getChainFeeEstimate({lnd, send_to: sendTo});
```

### getChainFeeRate

Get chain fee rate estimate

Requires LND built with `walletrpc` tag

Requires `onchain:read` permission

    {
      [confirmation_target]: <Future Blocks Confirmation Number>
      lnd: <Authenticated LND API Object>
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

Requires `onchain:read` permission

    {
      [after]: <Confirmed After Current Best Chain Block Height Number>
      [before]: <Confirmed Before Current Best Chain Block Height Number>
      lnd: <Authenticated LND Object>
    }

    @returns via cbk or Promise
    {
      transactions: [{
        [block_id]: <Block Hash String>
        [confirmation_count]: <Confirmation Count Number>
        [confirmation_height]: <Confirmation Block Height Number>
        created_at: <Created ISO 8601 Date String>
        [description]: <Transaction Label String>
        [fee]: <Fees Paid Tokens Number>
        id: <Transaction Id String>
        is_confirmed: <Is Confirmed Bool>
        is_outgoing: <Transaction Outbound Bool>
        output_addresses: [<Address String>]
        tokens: <Tokens Including Fee Number>
        [transaction]: <Raw Transaction Hex String>
      }]
    }

Example:

```node
const {getChainTransactions} = require('ln-service');
const {transactions} = await getChainTransactions({lnd});
```

### getChannelBalance

Get balance across channels.

Requires `offchain:read` permission

`channel_balance_mtokens` is not supported on LND 0.11.1 and below

`inbound` and `inbound_mtokens` are not supported on LND 0.11.1 and below

`pending_inbound` is not supported on LND 0.11.1 and below

`unsettled_balance` is not supported on LND 0.11.1 and below

`unsettled_balance_mtokens` is not supported on LND 0.11.1 and below

    {
      lnd: <Authenticated LND API Object>
    }

    @returns via cbk or Promise
    {
      channel_balance: <Channels Balance Tokens Number>
      [channel_balance_mtokens]: <Channels Balance Millitokens String>
      [inbound]: <Inbound Liquidity Tokens Number>
      [inbound_mtokens]: <Inbound Liquidity Millitokens String>
      pending_balance: <Pending On-Chain Channels Balance Tokens Number>
      [pending_inbound]: <Pending On-Chain Inbound Liquidity Tokens Number>
      [unsettled_balance]: <In-Flight Tokens Number>
      [unsettled_balance_mtokens]: <In-Flight Millitokens Number>
    }

Example:

```node
const {getChannelBalance} = require('ln-service');
const balanceInChannels = (await getChannelBalance({lnd})).channel_balance;
```

### getChannel

Get graph information about a channel on the network

Requires `info:read` permission

    {
      id: <Standard Format Channel Id String>
      lnd: <Authenticated LND API Object>
    }

    @returns via cbk or Promise
    {
      capacity: <Maximum Tokens Number>
      id: <Standard Format Channel Id String>
      policies: [{
        [base_fee_mtokens]: <Base Fee Millitokens String>
        [cltv_delta]: <Locktime Delta Number>
        [fee_rate]: <Fees Charged Per Million Millitokens Number>
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

Requires `offchain:read` permission

`in_channel`, `in_payment`, `is_forward`, `out_channel`, `out_payment`,
`payment` are not supported on LND 0.11.1 and below

    {
      [is_active]: <Limit Results To Only Active Channels Bool> // false
      [is_offline]: <Limit Results To Only Offline Channels Bool> // false
      [is_private]: <Limit Results To Only Private Channels Bool> // false
      [is_public]: <Limit Results To Only Public Channels Bool> // false
      lnd: <Authenticated LND gRPC API Object>
      [partner_public_key]: <Only Channels With Public Key Hex String>
    }

    @returns via cbk or Promise
    {
      channels: [{
        capacity: <Channel Token Capacity Number>
        commit_transaction_fee: <Commit Transaction Fee Number>
        commit_transaction_weight: <Commit Transaction Weight Number>
        [cooperative_close_address]: <Coop Close Restricted to Address String>
        [cooperative_close_delay_height]: <Prevent Coop Close Until Height Number>
        id: <Standard Format Channel Id String>
        is_active: <Channel Active Bool>
        is_closing: <Channel Is Closing Bool>
        is_opening: <Channel Is Opening Bool>
        is_partner_initiated: <Channel Partner Opened Channel Bool>
        is_private: <Channel Is Private Bool>
        is_static_remote_key: <Remote Key Is Static Bool>
        local_balance: <Local Balance Tokens Number>
        [local_csv]: <Local CSV Blocks Delay Number>
        [local_dust]: <Remote Non-Enforceable Amount Tokens Number>
        [local_given]: <Local Initially Pushed Tokens Number>
        [local_max_htlcs]: <Local Maximum Attached HTLCs Number>
        [local_max_pending_mtokens]: <Local Maximum Pending Millitokens String>
        [local_min_htlc_mtokens]: <Local Minimum HTLC Millitokens String>
        local_reserve: <Local Reserved Tokens Number>
        partner_public_key: <Channel Partner Public Key String>
        pending_payments: [{
          id: <Payment Preimage Hash Hex String>
          [in_channel]: <Forward Inbound From Channel Id String>
          [in_payment]: <Payment Index on Inbound Channel Number>
          [is_forward]: <Payment is a Forward Bool>
          is_outgoing: <Payment Is Outgoing Bool>
          [out_channel]: <Forward Outbound To Channel Id String>
          [out_payment]: <Payment Index on Outbound Channel Number>
          [payment]: <Payment Attempt Id Number>
          timeout: <Chain Height Expiration Number>
          tokens: <Payment Tokens Number>
        }]
        received: <Received Tokens Number>
        remote_balance: <Remote Balance Tokens Number>
        [remote_csv]: <Remote CSV Blocks Delay Number>
        [remote_dust]: <Remote Non-Enforceable Amount Tokens Number>
        [remote_given]: <Remote Initially Pushed Tokens Number>
        [remote_max_htlcs]: <Remote Maximum Attached HTLCs Number>
        [remote_max_pending_mtokens]: <Remote Maximum Pending Millitokens String>
        [remote_min_htlc_mtokens]: <Remote Minimum HTLC Millitokens String>
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

Requires `offchain:read` permission

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
        [close_balance_spent_by]: <Channel Balance Output Spent By Tx Id String>
        [close_balance_vout]: <Channel Balance Close Tx Output Index Number>
        close_payments: [{
          is_outgoing: <Payment Is Outgoing Bool>
          is_paid: <Payment Is Claimed With Preimage Bool>
          is_pending: <Payment Resolution Is Pending Bool>
          is_refunded: <Payment Timed Out And Went Back To Payer Bool>
          [spent_by]: <Close Transaction Spent By Transaction Id Hex String>
          tokens: <Associated Tokens Number>
          transaction_id: <Transaction Id Hex String>
          transaction_vout: <Transaction Output Index Number>
        }]
        [close_confirm_height]: <Channel Close Confirmation Height Number>
        [close_transaction_id]: <Closing Transaction Id Hex String>
        final_local_balance: <Channel Close Final Local Balance Tokens Number>
        final_time_locked_balance: <Closed Channel Timelocked Tokens Number>
        [id]: <Closed Standard Format Channel Id String>
        is_breach_close: <Is Breach Close Bool>
        is_cooperative_close: <Is Cooperative Close Bool>
        is_funding_cancel: <Is Funding Cancelled Close Bool>
        is_local_force_close: <Is Local Force Close Bool>
        [is_partner_closed]: <Channel Was Closed By Channel Peer Bool>
        [is_partner_initiated]: <Channel Was Initiated By Channel Peer Bool>
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

Requires LND built with `wtclientrpc` build tag

Requires `offchain:read` permission

Includes previously connected watchtowers

    {
      lnd: <Authenticated LND API Object>
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

Requires `offchain:read` permission

    {
      lnd: <Authenticated LND API Object>
    }

    @returns via cbk or Promise
    {
      channels: [{
        base_fee: <Base Flat Fee Tokens Rounded Up Number>
        base_fee_mtokens: <Base Flat Fee Millitokens String>
        id: <Standard Format Channel Id String>
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

    {
      from: <From Public Key Hex String>
      lnd: <Authenticated LND gRPC API Object>
      mtokens: <Millitokens To Send String>
      to: <To Public Key Hex String>
    }

    @returns via cbk or Promise
    {
      confidence: <Success Confidence Score Out Of One Million Number>
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

Requires `offchain:read` permission

    {
      lnd: <Authenticated LND API Object>
    }

    @returns via cbk or Promise
    {
      nodes: [{
        peers: [{
          [failed_tokens]: <Failed to Forward Tokens Number>
          [forwarded_tokens]: <Forwarded Tokens Number>
          [last_failed_forward_at]: <Failed Forward At ISO-8601 Date String>
          [last_forward_at]: <Forwarded At ISO 8601 Date String>
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

Requires `offchain:read` permission

    {
      [after]: <Get Only Payments Forwarded At Or After ISO 8601 Date String>
      [before]: <Get Only Payments Forwarded Before ISO 8601 Date String>
      [limit]: <Page Result Limit Number>
      lnd: <Authenticated LND API Object>
      [token]: <Opaque Paging Token String>
    }

    @returns via cbk or Promise
    {
      forwards: [{
        created_at: <Forward Record Created At ISO 8601 Date String>
        fee: <Fee Tokens Charged Number>
        fee_mtokens: <Approximated Fee Millitokens Charged String>
        incoming_channel: <Incoming Standard Format Channel Id String>
        mtokens: <Forwarded Millitokens String>
        outgoing_channel: <Outgoing Standard Format Channel Id String>
        tokens: <Forwarded Tokens Number>
      }]
      [next]: <Continue With Opaque Paging Token String>
    }

Example:

```node
const {getForwards} = require('ln-service');
const {forwards} = await getForwards({lnd});
```

### getHeight

Lookup the current best block height

LND with `chainrpc` build tag and `onchain:read` permission is suggested

Otherwise, `info:read` permission is required

    {
      lnd: <Authenticated LND API Object>
    }

    @returns via cbk or Promise
    {
      current_block_hash: <Best Chain Hash Hex String>
      current_block_height: <Best Chain Height Number>
    }

Example:

```node
const {getHeight} = require('ln-service');

// Check for the current best chain block height
const height = (await getHeight({lnd})).current_block_height;
```

### getIdentity

Lookup the identity key for a node

LND with `walletrpc` build tag and `address:read` permission is suggested

Otherwise, `info:read` permission is required

    {
      lnd: <Authenticated LND API Object>
    }

    @returns via cbk or Promise
    {
      public_key: <Node Identity Public Key Hex String>
    }

Example:

```node
const {getIdentity} = require('ln-service');

// Derive the identity public key of the backing LND node
const nodePublicKey = (await getIdentity({lnd})).public_key;
```

### getInvoice

Lookup a channel invoice.

The received value and the invoiced value may differ as invoices may be
over-paid.

Requires `invoices:read` permission

    {
      id: <Payment Hash Id Hex String>
      lnd: <Authenticated LND API Object>
    }

    @returns via cbk or Promise
    {
      [chain_address]: <Fallback Chain Address String>
      cltv_delta: <CLTV Delta Number>
      [confirmed_at]: <Settled at ISO 8601 Date String>
      created_at: <ISO 8601 Date String>
      description: <Description String>
      [description_hash]: <Description Hash Hex String>
      expires_at: <ISO 8601 Date String>
      features: [{
        bit: <BOLT 09 Feature Bit Number>
        is_known: <Feature is Known Bool>
        is_required: <Feature Support is Required To Pay Bool>
        type: <Feature Type String>
      }]
      id: <Payment Hash String>
      [is_canceled]: <Invoice is Canceled Bool>
      is_confirmed: <Invoice is Confirmed Bool>
      [is_held]: <HTLC is Held Bool>
      is_private: <Invoice is Private Bool>
      [is_push]: <Invoice is Push Payment Bool>
      payments: [{
        [confirmed_at]: <Payment Settled At ISO 8601 Date String>
        created_at: <Payment Held Since ISO 860 Date String>
        created_height: <Payment Held Since Block Height Number>
        in_channel: <Incoming Payment Through Channel Id String>
        is_canceled: <Payment is Canceled Bool>
        is_confirmed: <Payment is Confirmed Bool>
        is_held: <Payment is Held Bool>
        messages: [{
          type: <Message Type Number String>
          value: <Raw Value Hex String>
        }]
        mtokens: <Incoming Payment Millitokens String>
        [pending_index]: <Pending Payment Channel HTLC Index Number>
        tokens: <Payment Tokens Number>
      }]
      received: <Received Tokens Number>
      received_mtokens: <Received Millitokens String>
      [request]: <Bolt 11 Invoice String>
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

Requires `invoices:read` permission

    {
      [limit]: <Page Result Limit Number>
      lnd: <Authenticated LND API Object>
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
        features: [{
          bit: <BOLT 09 Feature Bit Number>
          is_known: <Feature is Known Bool>
          is_required: <Feature Support is Required To Pay Bool>
          type: <Feature Type String>
        }]
        id: <Payment Hash String>
        [is_canceled]: <Invoice is Canceled Bool>
        is_confirmed: <Invoice is Confirmed Bool>
        [is_held]: <HTLC is Held Bool>
        is_private: <Invoice is Private Bool>
        [is_push]: <Invoice is Push Payment Bool>
        payments: [{
          [confirmed_at]: <Payment Settled At ISO 8601 Date String>
          created_at: <Payment Held Since ISO 860 Date String>
          created_height: <Payment Held Since Block Height Number>
          in_channel: <Incoming Payment Through Channel Id String>
          is_canceled: <Payment is Canceled Bool>
          is_confirmed: <Payment is Confirmed Bool>
          is_held: <Payment is Held Bool>
          messages: [{
            type: <Message Type Number String>
            value: <Raw Value Hex String>
          }]
          mtokens: <Incoming Payment Millitokens String>
          [pending_index]: <Pending Payment Channel HTLC Index Number>
          tokens: <Payment Tokens Number>
          [total_mtokens]: <Total Millitokens String>
        }]
        received: <Received Tokens Number>
        received_mtokens: <Received Millitokens String>
        [request]: <Bolt 11 Invoice String>
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

### getMethods

Get the list of all methods and their associated requisite permissions

Note: this method is not supported in LND versions 0.11.1 and below

Requires `info:read` permission

    {
      lnd: <Authenticated LND API Object>
    }

    @returns via cbk or Promise
    {
      methods: [{
        endpoint: <Method Endpoint Path String>
        permissions: <Entity:Action String>]
      }]
    }

Example:

```node
const {getMethods} = require('ln-service');
const perrmissions = ['info:read'];

const {methods} = await getMethods({lnd});

// Calculate allowed methods for permissions set
const allowedMethods = methods.filter(method => {
  // A method is allowed if all of its permissions are included
  return !method.permissions.find(n => !permissions.includes(n));
});
```

### getNetworkCentrality

Get the graph centrality scores of the nodes on the network

Scores are from 0 to 1,000,000.

Requires `info:read` permission

    {
      lnd: <Authenticated LND API Object>
    }

    @returns via cbk or Promise
    {
      nodes: [{
        betweenness: <Betweenness Centrality Number>
        betweenness_normalized: <Normalized Betweenness Centrality Number>
        public_key: <Node Public Key Hex String>
      }]
    }

```node
const {getNetworkCentrality} = require('ln-service');

// Calculate centrality scores for all graph nodes
const centrality = await getNetworkCentrality({lnd});
```

### getNetworkGraph

Get the network graph

Requires `info:read` permission

    {
      lnd: <Authenticated LND API Object>
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
        features: [{
          bit: <BOLT 09 Feature Bit Number>
          is_known: <Feature is Known Bool>
          is_required: <Feature Support is Required Bool>
          type: <Feature Type String>
        }]
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

Requires `info:read` permission

    {
      lnd: <Authenticated LND API Object>
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

Requires `info:read` permission

    {
      [is_omitting_channels]: <Omit Channels from Node Bool>
      lnd: <Authenticated LND API Object>
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
          [fee_rate]: <Fees Charged Per Million Millitokens Number>
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
      features: [{
        bit: <BOLT 09 Feature Bit Number>
        is_known: <Feature is Known Bool>
        is_required: <Feature Support is Required Bool>
        type: <Feature Type String>
      }]
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

Requires `offchain:read` permission

    {
      id: <Payment Preimage Hash Hex String>
      lnd: <Authenticated LND API Object>
    }

    @returns via cbk or Promise
    {
      [failed]: {
        is_insufficient_balance: <Failed Due To Lack of Balance Bool>
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
          fee: <Routing Fee Tokens Number>
          fee_mtokens: <Fee Millitokens String>
          forward: <Forwarded Tokens Number>
          forward_mtokens: <Forward Millitokens String>
          public_key: <Public Key Hex String>
          timeout: <Timeout Block Height Number>
        }]
        id: <Payment Hash Hex String>
        mtokens: <Total Millitokens Paid String>
        safe_fee: <Payment Forwarding Fee Rounded Up Tokens Number>
        safe_tokens: <Payment Tokens Rounded Up Number>
        secret: <Payment Preimage Hex String>
        timeout: <Expiration Block Height Number>
        tokens: <Total Tokens Paid Number>
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

Requires `offchain:read` permission

    {
      [limit]: <Page Result Limit Number>
      lnd: <Authenticated LND API Object>
      [token]: <Opaque Paging Token String>
    }

    @returns via cbk or Promise
    {
      payments: [{
        attempts: [{
          [failure]: {
            code: <Error Type Code Number>
            [details]: {
              [channel]: <Standard Format Channel Id String>
              [height]: <Error Associated Block Height Number>
              [index]: <Failed Hop Index Number>
              [mtokens]: <Error Millitokens String>
              [policy]: {
                base_fee_mtokens: <Base Fee Millitokens String>
                cltv_delta: <Locktime Delta Number>
                fee_rate: <Fees Charged Per Million Tokens Number>
                [is_disabled]: <Channel is Disabled Bool>
                max_htlc_mtokens: <Maximum HLTC Millitokens Value String>
                min_htlc_mtokens: <Minimum HTLC Millitokens Value String>
                updated_at: <Updated At ISO 8601 Date String>
              }
              [timeout_height]: <Error CLTV Timeout Height Number>
              [update]: {
                chain: <Chain Id Hex String>
                channel_flags: <Channel Flags Number>
                extra_opaque_data: <Extra Opaque Data Hex String>
                message_flags: <Message Flags Number>
                signature: <Channel Update Signature Hex String>
              }
            }
            message: <Error Message String>
          }
          is_confirmed: <Payment Attempt Succeeded Bool>
          is_failed: <Payment Attempt Failed Bool>
          is_pending: <Payment Attempt is Waiting For Resolution Bool>
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
              [public_key]: <Forward Edge Public Key Hex String>
              [timeout]: <Timeout Block Height Number>
            }]
            mtokens: <Total Fee-Inclusive Millitokens String>
            [payment]: <Payment Identifier Hex String>
            timeout: <Timeout Block Height Number>
            tokens: <Total Fee-Inclusive Tokens Number>
            [total_mtokens]: <Total Millitokens String>
          }
        }]
        created_at: <Payment at ISO-8601 Date String>
        destination: <Destination Node Public Key Hex String>
        fee: <Paid Routing Fee Rounded Down Tokens Number>
        fee_mtokens: <Paid Routing Fee in Millitokens String>
        hops: [<First Route Hop Public Key Hex String>]
        id: <Payment Preimage Hash String>
        [index]: <Payment Add Index Number>
        is_confirmed: <Payment is Confirmed Bool>
        is_outgoing: <Transaction Is Outgoing Bool>
        mtokens: <Millitokens Sent to Destination String>
        [request]: <BOLT 11 Payment Request String>
        safe_fee: <Payment Forwarding Fee Rounded Up Tokens Number>
        safe_tokens: <Payment Tokens Rounded Up Number>
        secret: <Payment Preimage Hex String>
        tokens: <Rounded Down Tokens Sent to Destination Number>
      }]
      [next]: <Next Opaque Paging Token String>
    }

Example:

```node
const {getPayments} = require('ln-service');
const {payments} = await getPayments({lnd});
```

### getPeers

Get connected peers.

Requires `peers:read` permission

LND 0.11.1 and below do not return `last_reconnected` or `reconnection_rate`

    {
      lnd: <Authenticated LND API Object>
    }

    @returns via cbk or Promise
    {
      peers: [{
        bytes_received: <Bytes Received Number>
        bytes_sent: <Bytes Sent Number>
        features: [{
          bit: <BOLT 09 Feature Bit Number>
          is_known: <Feature is Known Bool>
          is_required: <Feature Support is Required Bool>
          type: <Feature Type String>
        }]
        is_inbound: <Is Inbound Peer Bool>
        [is_sync_peer]: <Is Syncing Graph Data Bool>
        [last_reconnected]: <Peer Last Reconnected At ISO 8601 Date String>
        ping_time: <Ping Latency Milliseconds Number>
        public_key: <Node Identity Public Key String>
        [reconnection_rate]: <Count of Reconnections Over Time Number>
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

Get pending chain balance in simple unconfirmed outputs.

Pending channels limbo balance is not included

Requires `onchain:read` permission

    {
      lnd: <Authenticated LND API Object>
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

Requires `offchain:read` permission

    {
      lnd: <Authenticated LND API Object>
    }

    @returns via cbk or Promise
    {
      pending_channels: [{
        [close_transaction_id]: <Channel Closing Transaction Id String>
        is_active: <Channel Is Active Bool>
        is_closing: <Channel Is Closing Bool>
        is_opening: <Channel Is Opening Bool>
        [is_partner_initiated]: <Channel Partner Initiated Channel Bool>
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

Omit a key index to cycle to the "next" key in the family

Requires LND compiled with `walletrpc` build tag

Requires `address:read` permission

    {
      family: <Key Family Number>
      [index]: <Key Index Number>
      lnd: <Authenticated API LND Object>
    }

    @returns via cbk or Promise
    {
      index: <Key Index Number>
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

If `from` is not set, self is default

Requires `offchain:read` permission

    {
      [from]: <Starting Hex Serialized Public Key>
      hops: [{
        forward_mtokens: <Forward Millitokens String>
        public_key: <Forward Edge Public Key Hex String>
      }]
      lnd: <Authenticated LND API Object>
    }

    @returns via cbk or Promise
    {
      confidence: <Confidence Score Out Of One Million Number>
    }

Example:

```node
const {getRouteConfidence, getRouteToDestination} = require('ln-service');
const destination = 'destinationPublicKeyHexString';

const {route} = await getRouteToDestination({destination, lnd, tokens: 80085});

// Confidence in payment success
const {confidence} = (await getRouteConfidence({lnd, hops: route.hops}));
```

### getRouteThroughHops

Get an outbound route that goes through specific hops

Requires `offchain:read` permission

    {
      [cltv_delta]: <Final CLTV Delta Number>
      lnd: <Authenticated LND API Object>
      [mtokens]: <Millitokens to Send String>
      [outgoing_channel]: <Outgoing Channel Id String>
      [messages]: [{
        type: <Message Type Number String>
        value: <Message Raw Value Hex Encoded String>
      }]
      [payment]: <Payment Identifier Hex String>
      public_keys: [<Public Key Hex String>]
      [tokens]: <Tokens to Send Number>
      [total_mtokens]: <Payment Total Millitokens String>
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
        [messages]: [{
          type: <Message Type Number String>
          value: <Message Raw Value Hex Encoded String>
        }]
        mtokens: <Total Fee-Inclusive Millitokens String>
        [payment]: <Payment Identifier Hex String>
        safe_fee: <Payment Forwarding Fee Rounded Up Tokens Number>
        safe_tokens: <Payment Tokens Rounded Up Number>
        timeout: <Route Timeout Height Number>
        tokens: <Total Fee-Inclusive Tokens Number>
        [total_mtokens]: <Payment Total Millitokens String>
      }
    }

Example:

```node
const {getRouteThroughHops, payViaRoutes} = require('ln-service');
const destination = 'destinationPublicKeyHexString';
const mtokens = '1000';
const peer = 'peerPublicKeyHexString';
const {route} = await getRouteThroughHops({lnd, public_keys: [peer, destination]});
await payViaRoutes({lnd, routes: [route]});
```

### getRouteToDestination

Get a route to a destination.

Call this iteratively after failed route attempts to get new routes

Requires `info:read` permission

    {
      [cltv_delta]: <Final CLTV Delta Number>
      destination: <Final Send Destination Hex Encoded Public Key String>
      [features]: [{
        bit: <Feature Bit Number>
      }]
      [ignore]: [{
        [channel]: <Channel Id String>
        from_public_key: <Public Key Hex String>
        [to_public_key]: <To Public Key Hex String>
      }]
      [incoming_peer]: <Incoming Peer Public Key Hex String>
      [is_ignoring_past_failures]: <Ignore Past Failures Bool>
      lnd: <Authenticated LND API Object>
      [max_fee]: <Maximum Fee Tokens Number>
      [max_fee_mtokens]: <Maximum Fee Millitokens String>
      [max_timeout_height]: <Max CLTV Timeout Number>
      [messages]: [{
        type: <Message To Final Destination Type Number String>
        value: <Message To Final Destination Raw Value Hex Encoded String>
      }]
      [mtokens]: <Tokens to Send String>
      [outgoing_channel]: <Outgoing Channel Id String>
      [payment]: <Payment Identifier Hex Strimng>
      [routes]: [[{
        [base_fee_mtokens]: <Base Routing Fee In Millitokens String>
        [channel]: <Standard Format Channel Id String>
        [channel_capacity]: <Channel Capacity Tokens Number>
        [cltv_delta]: <CLTV Delta Blocks Number>
        [fee_rate]: <Fee Rate In Millitokens Per Million Number>
        public_key: <Forward Edge Public Key Hex String>
      }]]
      [start]: <Starting Node Public Key Hex String>
      [tokens]: <Tokens Number>
      [total_mtokens]: <Total Millitokens of Shards String>
    }

    @returns via cbk or Promise
    {
      [route]: {
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
        [messages]: [{
          type: <Message Type Number String>
          value: <Message Raw Value Hex Encoded String>
        }]
        mtokens: <Total Fee-Inclusive Millitokens String>
        safe_fee: <Payment Forwarding Fee Rounded Up Tokens Number>
        safe_tokens: <Payment Tokens Rounded Up Number>
        timeout: <Route Timeout Height Number>
        tokens: <Total Fee-Inclusive Tokens Number>
      }
    }

Example:

```node
const {getRouteToDestination, payViaRoutes} = require('ln-service');
const destination = 'destinationPublicKeyHexString';
const tokens = 1000;
const {route} = await getRouteToDestination({destination, lnd, tokens});
await payViaRoutes({lnd, routes: [route]});
```

### getSweepTransactions

Get self-transfer spend transactions related to channel closes

Requires `onchain:read` permission

    {
      lnd: <Authenticated LND API Object>
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
        is_confirmed: <Is Confirmed Bool>
        is_outgoing: <Transaction Outbound Bool>
        output_addresses: [<Address String>]
        spends: [{
          [tokens]: <Output Tokens Number>
          transaction_id: <Spend Transaction Id Hex String>
          transaction_vout: <Spend Transaction Output Index Number>
        }]
        tokens: <Tokens Including Fee Number>
        [transaction]: <Raw Transaction Hex String>
      }]
    }

Example:

```node
const {getSweepTransactions} = require('ln-service');

const {transactions} = await getSweepTransactions({lnd});
```

### getTowerServerInfo

Get watchtower server info.

This method requires LND built with `watchtowerrpc` build tag

Requires `info:read` permission

    {
      lnd: <Authenticated LND API Object>
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

Requires `onchain:read` permission

    {
      lnd: <Authenticated LND API Object>
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

Requires `info:read` permission

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
      features: [{
        bit: <BOLT 09 Feature Bit Number>
        is_known: <Feature is Known Bool>
        is_required: <Feature Support is Required Bool>
        type: <Feature Type String>
      }]
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

### getWalletVersion

Get wallet version

Tags are self-reported by LND and are not guaranteed to be accurate

Requires `info:read` permission

    {
      lnd: <Authenticated LND API Object>
    }

    @returns via cbk or Promise
    {
      build_tags: [<Build Tag String>]
      commit_hash: <Commit SHA1 160 Bit Hash Hex String>
      is_autopilotrpc_enabled: <Is Autopilot RPC Enabled Bool>
      is_chainrpc_enabled: <Is Chain RPC Enabled Bool>
      is_invoicesrpc_enabled: <Is Invoices RPC Enabled Bool>
      is_signrpc_enabled: <Is Sign RPC Enabled Bool>
      is_walletrpc_enabled: <Is Wallet RPC Enabled Bool>
      is_watchtowerrpc_enabled: <Is Watchtower Server RPC Enabled Bool>
      is_wtclientrpc_enabled: <Is Watchtower Client RPC Enabled Bool>
      [version]: <Recognized LND Version String>
    }

```node
const {getWalletVersion} = require('ln-service');

// Determine if the invoices rpc build tag was used with the running LND
const hasInvoicesRpc = (await getWalletVersion({lnd})).is_invoicesrpc_enabled;
```

### grantAccess

Give access to the node by making a macaroon access credential

Specify `id` to allow for revoking future access

Requires `macaroon:generate` permission

Note: access once given cannot be revoked. Access is defined at the LND level
and version differences in LND can result in expanded access.

Note: `id` is not supported in LND versions 0.11.0 and below

    {
      [id]: <Macaroon Id Positive Numeric String>
      [is_ok_to_adjust_peers]: <Can Add or Remove Peers Bool>
      [is_ok_to_create_chain_addresses]: <Can Make New Addresses Bool>
      [is_ok_to_create_invoices]: <Can Create Lightning Invoices Bool>
      [is_ok_to_create_macaroons]: <Can Create Macaroons Bool>
      [is_ok_to_derive_keys]: <Can Derive Public Keys Bool>
      [is_ok_to_get_access_ids]: <Can List Access Ids Bool>
      [is_ok_to_get_chain_transactions]: <Can See Chain Transactions Bool>
      [is_ok_to_get_invoices]: <Can See Invoices Bool>
      [is_ok_to_get_wallet_info]: <Can General Graph and Wallet Information Bool>
      [is_ok_to_get_payments]: <Can Get Historical Lightning Transactions Bool>
      [is_ok_to_get_peers]: <Can Get Node Peers Information Bool>
      [is_ok_to_pay]: <Can Send Funds or Edit Lightning Payments Bool>
      [is_ok_to_revoke_access_ids]: <Can Revoke Access Ids Bool>
      [is_ok_to_send_to_chain_addresses]: <Can Send Coins On Chain Bool>
      [is_ok_to_sign_bytes]: <Can Sign Bytes From Node Keys Bool>
      [is_ok_to_sign_messages]: <Can Sign Messages From Node Key Bool>
      [is_ok_to_stop_daemon]: <Can Terminate Node or Change Operation Mode Bool>
      [is_ok_to_verify_bytes_signatures]: <Can Verify Signatures of Bytes Bool>
      [is_ok_to_verify_messages]: <Can Verify Messages From Node Keys Bool>
      lnd: <Authenticated LND gRPC API Object>
      [permissions]: [<Entity:Action String>]
    }

    @returns via cbk or Promise
    {
      macaroon: <Base64 Encoded Macaroon String>
      permissions: [<Entity:Action String>]
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

### grpcProxyServer

Get a gRPC proxy server

    {
      [bind]: <Bind to Address String>
      [cert]: <LND Cert Base64 String>
      log: <Log Function>
      path: <Router Path String>
      port: <Listen Port Number>
      socket: <LND Socket String>
      stream: <Log Write Stream Object>
    }

    @returns
    {
      app: <Express Application Object>
      server: <Web Server Object>
      wss: <WebSocket Server Object>
    }

```node
const {getWalletInfo} = require('ln-service');
const {lndGateway} = require('lightning');
const request = require('@alexbosworth/request');
const websocket = require('ws');
const {Writable} = require('stream');

const log = output => console.log(output);
const path = '/lnd/';
const port = 8050;

const {app, server, wss} = grpcProxyServer({
  log,
  path,
  port,
  cert: base64Encoded64TlsCertFileString,
  socket: 'localhost:10009',
  stream: new Writable({write: (chunk, encoding, cbk) => cbk()}),
});

// Create an authenticated LND for the gRPC REST gateway
const {lnd} = lndGateway({
  request,
  macaroon: base64EncodedMacaroonFileString,
  url: `http://localhost:${port}${path}`,
});

// Make a request to a gRPC method through the REST proxy
const nodeInfo = await getWalletInfo({lnd});
```

### isDestinationPayable

Determine if a payment destination is actually payable by probing it

Requires `offchain:write` permission

    {
      [cltv_delta]: <Final CLTV Delta Number>
      destination: <Pay to Node with Public Key Hex String>
      [incoming_peer]: <Pay Through Specific Final Hop Public Key Hex String>
      lnd: <Authenticated LND API Object>
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

### lockUtxo

Lock UTXO

Requires `onchain:write` permission

Requires LND built with `walletrpc` build tag

    {
      [id]: <Lock Identifier Hex String>
      lnd: <Authenticated LND gRPC API Object>
      transaction_id: <Unspent Transaction Id Hex String>
      transaction_vout: <Unspent Transaction Output Index Number>
    }

    @returns via cbk or Promise
    {
      expires_at: <Lock Expires At ISO 8601 Date String>
      id: <Locking Id Hex String>
    }

Example:

```node
const {getUtxos, lockUtxo, sendToChainAddress} = require('ln-service');

// Assume a wallet that has only one UTXO
const [utxo] = (await getUtxos({lnd})).utxos;

const locked = await lockUtxo({
  lnd,
  transaction_id: utxo.transaction_id,
  transaction_vout: utxo.transaction_vout,
});

const futureUnlockDate = new Date(locked.expires_at);

// This call will throw an error as LND will treat the UTXO as being locked
await sendToChainAddress({address, lnd, tokens});
```

### openChannel

Open a new channel.

The capacity of the channel is set with local_tokens

If give_tokens is set, it is a gift and it does not alter the capacity

Requires `offchain:write`, `onchain:write`, `peers:write` permissions

    {
      [chain_fee_tokens_per_vbyte]: <Chain Fee Tokens Per VByte Number>
      [cooperative_close_address]: <Restrict Cooperative Close To Address String>
      [give_tokens]: <Tokens to Gift To Partner Number> // Defaults to zero
      [is_private]: <Channel is Private Bool> // Defaults to false
      lnd: <Authenticated LND API Object>
      local_tokens: <Local Tokens Number>
      [min_confirmations]: <Spend UTXOs With Minimum Confirmations Number>
      [min_htlc_mtokens]: <Minimum HTLC Millitokens String>
      partner_public_key: <Public Key Hex String>
      [partner_csv_delay]: <Peer Output CSV Delay Number>
      [partner_socket]: <Peer Connection Host:Port String>
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

### openChannels

Open one or more channels

Requires `offchain:write`, `onchain:write` permissions

After getting the addresses and tokens to fund, use `fundChannels` within ten
minutes to fund the channels.

If you do not fund the channels, be sure to `cancelPendingChannel`s on each
channel that was not funded.

    {
      channels: [{
        capacity: <Channel Capacity Tokens Number>
        [cooperative_close_address]: <Restrict Coop Close To Address String>
        [give_tokens]: <Tokens to Gift To Partner Number> // Defaults to zero
        [is_private]: <Channel is Private Bool> // Defaults to false
        [min_htlc_mtokens]: <Minimum HTLC Millitokens String>
        partner_public_key: <Public Key Hex String>
        [partner_csv_delay]: <Peer Output CSV Delay Number>
        [partner_socket]: <Peer Connection Host:Port String>
      }]
      lnd: <Authenticated LND API Object>
    }

    @returns via cbk or Promise
    {
      pending: [{
        address: <Address To Send To String>
        id: <Pending Channel Id Hex String>
        tokens: <Tokens to Send Number>
      }]
    }

Example:

```node
const {fundPendingChannels, openChannels} = require('ln-service');

const channelsToOpen = [{capacity: 1e6, partner_public_key: publicKey}];

const {pending} = await openChannels({lnd, channels: channelsToOpen});

const channels = pending.map(n => n.id);

await fundPendingChannels({lnd, channels, funding: hexEncodedPsbt});
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
      features: [{
        bit: <BOLT 09 Feature Bit Number>
        is_required: <Feature Support is Required To Pay Bool>
        type: <Feature Type String>
      }]
      id: <Payment Request Hash String>
      is_expired: <Invoice is Expired Bool>
      [mtokens]: <Requested Milli-Tokens Value String> (can exceed Number limit)
      network: <Network Name String>
      [payment]: <Payment Identifier Hex Encoded String>
      [routes]: [[{
        [base_fee_mtokens]: <Base Fee Millitokens String>
        [channel]: <Standard Format Channel Id String>
        [cltv_delta]: <Final CLTV Expiration Blocks Delta Number>
        [fee_rate]: <Fee Rate Millitokens Per Million Number>
        public_key: <Forward Edge Public Key Hex String>
      }]]
      [safe_tokens]: <Requested Tokens Rounded Up Number>
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

Requires `offchain:write` permission

    {
      [incoming_peer]: <Pay Through Specific Final Hop Public Key Hex String>
      lnd: <Authenticated LND API Object>
      [max_fee]: <Maximum Additional Fee Tokens To Pay Number>
      [max_fee_mtokens]: <Maximum Fee Millitokens to Pay String>
      [max_paths]: <Maximum Simultaneous Paths Number>
      [max_timeout_height]: <Max CLTV Timeout Number>
      [messages]: [{
        type: <Message Type Number String>
        value: <Message Raw Value Hex Encoded String>
      }]
      [mtokens]: <Millitokens to Pay String>
      [outgoing_channel]: <Pay Through Outbound Standard Channel Id String>
      [outgoing_channels]: [<Pay Out of Outgoing Channel Ids String>]
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
          [messages]: [{
            type: <Message Type Number String>
            value: <Message Raw Value Hex Encoded String>
          }]
          mtokens: <Total Millitokens To Pay String>
          [payment]: <Payment Identifier Hex String>
          timeout: <Expiration Block Height Number>
          tokens: <Total Tokens To Pay Number>
        }]
      }
      [pathfinding_timeout]: <Time to Spend Finding a Route Milliseconds Number>
      [request]: <BOLT 11 Payment Request String>
      [tokens]: <Total Tokens To Pay to Payment Request Number>
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
      safe_fee: <Payment Forwarding Fee Rounded Up Tokens Number>
      safe_tokens: <Payment Tokens Rounded Up Number>
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

If no id is specified, a random id will be used.

Requires `offchain:write` permission

    {
      [cltv_delta]: <Final CLTV Delta Number>
      destination: <Destination Public Key String>
      [features]: [{
        bit: <Feature Bit Number>
      }]
      [id]: <Payment Request Hash Hex String>
      [incoming_peer]: <Pay Through Specific Final Hop Public Key Hex String>
      lnd: <Authenticated LND API Object>
      [max_fee]: <Maximum Fee Tokens To Pay Number>
      [max_fee_mtokens]: <Maximum Fee Millitokens to Pay String>
      [max_paths]: <Maximum Simultaneous Paths Number>
      [max_timeout_height]: <Maximum Expiration CLTV Timeout Height Number>
      [messages]: [{
        type: <Message Type Number String>
        value: <Message Raw Value Hex Encoded String>
      }]
      [mtokens]: <Millitokens to Pay String>
      [outgoing_channel]: <Pay Out of Outgoing Channel Id String>
      [outgoing_channels]: [<Pay Out of Outgoing Channel Ids String>]
      [pathfinding_timeout]: <Time to Spend Finding a Route Milliseconds Number>
      routes: [[{
        [base_fee_mtokens]: <Base Routing Fee In Millitokens String>
        [channel]: <Standard Format Channel Id String>
        [cltv_delta]: <CLTV Blocks Delta Number>
        [fee_rate]: <Fee Rate In Millitokens Per Million Number>
        public_key: <Forward Edge Public Key Hex String>
      }]]
      [tokens]: <Tokens To Pay Number>
    }

    @returns via cbk or Promise
    {
      fee: <Total Fee Tokens Paid Rounded Down Number>
      fee_mtokens: <Total Fee Millitokens Paid String>
      hops: [{
        channel: <First Route Standard Format Channel Id String>
        channel_capacity: <First Route Channel Capacity Tokens Number>
        fee: <First Route Fee Tokens Rounded Down Number>
        fee_mtokens: <First Route Fee Millitokens String>
        forward_mtokens: <First Route Forward Millitokens String>
        public_key: <First Route Public Key Hex String>
        timeout: <First Route Timeout Block Height Number>
      }]
      id: <Payment Hash Hex String>
      mtokens: <Total Millitokens Paid String>
      paths: [{
        fee_mtokens: <Total Fee Millitokens Paid String>
        hops: [{
          channel: <First Route Standard Format Channel Id String>
          channel_capacity: <First Route Channel Capacity Tokens Number>
          fee: <First Route Fee Tokens Rounded Down Number>
          fee_mtokens: <First Route Fee Millitokens String>
          forward_mtokens: <First Route Forward Millitokens String>
          public_key: <First Route Public Key Hex String>
          timeout: <First Route Timeout Block Height Number>
        }]
        mtokens: <Total Millitokens Paid String>
      }]
      safe_fee: <Total Fee Tokens Paid Rounded Up Number>
      safe_tokens: <Total Tokens Paid, Rounded Up Number>
      secret: <Payment Preimage Hex String>
      timeout: <Expiration Block Height Number>
      tokens: <Total Tokens Paid Rounded Down Number>
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

Requires `offchain:write` permission

    {
      [incoming_peer]: <Pay Through Specific Final Hop Public Key Hex String>
      lnd: <Authenticated LND API Object>
      [max_fee]: <Maximum Fee Tokens To Pay Number>
      [max_fee_mtokens]: <Maximum Fee Millitokens to Pay String>
      [max_paths]: <Maximum Simultaneous Paths Number>
      [max_timeout_height]: <Maximum Height of Payment Timeout Number>
      [messages]: [{
        type: <Message Type Number String>
        value: <Message Raw Value Hex Encoded String>
      }]
      [mtokens]: <Millitokens to Pay String>
      [outgoing_channel]: <Pay Out of Outgoing Channel Id String>
      [outgoing_channels]: [<Pay Out of Outgoing Channel Ids String>]
      [pathfinding_timeout]: <Time to Spend Finding a Route Milliseconds Number>
      request: <BOLT 11 Payment Request String>
      [tokens]: <Tokens To Pay Number>
    }

    @returns via cbk or Promise
    {
      fee: <Total Fee Tokens Paid Rounded Down Number>
      fee_mtokens: <Total Fee Millitokens Paid String>
      hops: [{
        channel: <First Route Standard Format Channel Id String>
        channel_capacity: <First Route Channel Capacity Tokens Number>
        fee: <First Route Fee Tokens Rounded Down Number>
        fee_mtokens: <First Route Fee Millitokens String>
        forward_mtokens: <First Route Forward Millitokens String>
        public_key: <First Route Public Key Hex String>
        timeout: <First Route Timeout Block Height Number>
      }]
      id: <Payment Hash Hex String>
      mtokens: <Total Millitokens Paid String>
      paths: [{
        fee_mtokens: <Total Fee Millitokens Paid String>
        hops: [{
          channel: <First Route Standard Format Channel Id String>
          channel_capacity: <First Route Channel Capacity Tokens Number>
          fee: <First Route Fee Tokens Rounded Down Number>
          fee_mtokens: <First Route Fee Millitokens String>
          forward_mtokens: <First Route Forward Millitokens String>
          public_key: <First Route Public Key Hex String>
          timeout: <First Route Timeout Block Height Number>
        }]
        mtokens: <Total Millitokens Paid String>
      }]
      safe_fee: <Total Fee Tokens Paid Rounded Up Number>
      safe_tokens: <Total Tokens Paid, Rounded Up Number>
      secret: <Payment Preimage Hex String>
      timeout: <Expiration Block Height Number>
      tokens: <Total Tokens Paid Rounded Down Number>
    }

Example:

```node
const {payViaPaymentRequest} = require('ln-service');
const request = 'bolt11PaymentRequestString';
await payViaPaymentRequest({lnd, request});
```

### payViaRoutes

Make a payment via a specified route

If no id is specified, a random id will be used to send a test payment

Requires `offchain:write` permission

    {
      [id]: <Payment Hash Hex String>
      lnd: <Authenticated LND API Object>
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
        [messages]: [{
          type: <Message Type Number String>
          value: <Message Raw Value Hex Encoded String>
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
      safe_fee: <Payment Forwarding Fee Rounded Up Tokens Number>
      safe_tokens: <Payment Tokens Rounded Up Number>
      secret: <Payment Secret Preimage Hex String>
      tokens: <Total Tokens Sent Rounded Down Number>
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
const {getRouteToDestination, payViaRoutes} = require('ln-service');
const destination = 'destinationPublicKeyHexString';
const tokens = 80085;
const {route} = await getRouteToDestination({destination, lnd, tokens});
const preimage = (await payViaRoutes({lnd, routes: [route]})).secret;
```

### prepareForChannelProposal

Prepare for a channel proposal

Channel proposals can be made with `propose_channel`. Channel proposals can
allow for cooperative close delays or external funding flows.

Requires `offchain:write`, `onchain:write` permissions

    {
      [cooperative_close_delay]: <Cooperative Close Relative Delay Number>
      [id]: <Pending Id Hex String>
      key_index: <Channel Funding Output Multisig Local Key Index Number>
      lnd: <Authenticated LND API Object>
      remote_key: <Channel Funding Partner Multisig Public Key Hex String>
      transaction_id: <Funding Output Transaction Id Hex String>
      transaction_vout: <Funding Output Transaction Output Index Number>
    }

    @returns via cbk or Promise
    {
      id: <Pending Channel Id Hex String>
    }

Example:

```node
const {getPublicKey, prepareForChannelProposal} = require('ln-service');

const {id} = await prepareForChannelProposal({
  lnd: lndAlice,
  key_index: (await getPublicKey({family: 0, lnd: lndAlice})).index,
  remote_key: (await getPublicKey({family: 0, lnd: lndBob})).public_key,
  transaction_id: transactionId, // Form an outpoint paying to 2:2 of keys
  transaction_vout: transactionVout,
});
```

### probeForRoute

Probe to find a successful route

Requires `offchain:write` permission

    {
      [cltv_delta]: <Final CLTV Delta Number>
      destination: <Destination Public Key Hex String>
      [features]: [{
        bit: <Feature Bit Number>
      }]
      [ignore]: [{
        [channel]: <Channel Id String>
        from_public_key: <Public Key Hex String>
        [to_public_key]: <To Public Key Hex String>
      }]
      [incoming_peer]: <Incoming Peer Public Key Hex String>
      [is_ignoring_past_failures]: <Adjust Probe For Past Routing Failures Bool>
      [is_strict_hints]: <Only Route Through Specified Paths Bool>
      lnd: <Authenticated LND API Object>
      [max_fee]: <Maximum Fee Tokens Number>
      [max_fee_mtokens]: <Maximum Fee Millitokens to Pay String>
      [max_timeout_height]: <Maximum Height of Payment Timeout Number>
      [messages]: [{
        type: <Message To Final Destination Type Number String>
        value: <Message To Final Destination Raw Value Hex Encoded String>
      }]
      [mtokens]: <Millitokens to Pay String>
      [outgoing_channel]: <Outgoing Channel Id String>
      [path_timeout_ms]: <Time to Spend On A Path Milliseconds Number>
      [payment]: <Payment Identifier Hex String>
      [probe_timeout_ms]: <Probe Timeout Milliseconds Number>
      [routes]: [[{
        [base_fee_mtokens]: <Base Routing Fee In Millitokens Number>
        [channel_capacity]: <Channel Capacity Tokens Number>
        [channel]: <Standard Format Channel Id String>
        [cltv_delta]: <CLTV Blocks Delta Number>
        [fee_rate]: <Fee Rate In Millitokens Per Million Number>
        public_key: <Forward Edge Public Key Hex String>
      }]]
      tokens: <Tokens Number>
      [total_mtokens]: <Total Millitokens Across Paths String>
    }

    @returns via cbk or Promise
    {
      [route]: {
        [confidence]: <Route Confidence Score Out Of One Million Number>
        fee: <Route Fee Tokens Rounded Down Number>
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
        [messages]: [{
          type: <Message Type Number String>
          value: <Message Raw Value Hex Encoded String>
        }]
        mtokens: <Total Fee-Inclusive Millitokens String>
        [payment]: <Payment Identifier Hex String>
        safe_fee: <Payment Forwarding Fee Rounded Up Tokens Number>
        safe_tokens: <Payment Tokens Rounded Up Number>
        timeout: <Timeout Block Height Number>
        tokens: <Total Fee-Inclusive Tokens Rounded Down Number>
        [total_mtokens]: <Total Millitokens String>
      }
    }

Example:

```node
const {probeForRoute} = require('ln-service');
const destination = 'destinationNodePublicKeyHexString';
const tokens = 80085;
const {route} = await probeForRoute({destination, lnd, tokens});
```

### proposeChannel

Propose a new channel to a peer that prepared for the channel proposal

Channel proposals can allow for cooperative close delays or external funding
flows.

Requires `offchain:write`, `onchain:write` permissions

Requires LND compiled with `walletrpc` build tag

    {
      capacity: <Channel Capacity Tokens Number>
      [cooperative_close_address]: <Restrict Cooperative Close To Address String>
      [cooperative_close_delay]: <Cooperative Close Relative Delay Number>
      [give_tokens]: <Tokens to Gift To Partner Number> // Defaults to zero
      id: <Pending Channel Id Hex String>
      [is_private]: <Channel is Private Bool> // Defaults to false
      key_index: <Channel Funding Output MultiSig Local Key Index Number>
      lnd: <Authenticated LND API Object>
      partner_public_key: <Public Key Hex String>
      remote_key: <Channel Funding Partner MultiSig Public Key Hex String>
      transaction_id: <Funding Output Transaction Id Hex String>
      transaction_vout: <Funding Output Transaction Output Index Number>
    }

    @returns via cbk or Promise

```node
const {getPublicKey, prepareForChannelProposal} = require('ln-service');
const {getIdentity, proposeChannel} = require('ln-service');

// Alice and Bob need to have keys in the 2:2 funding output:
const aliceKey = await getPublicKey({family: 0, lnd: lndAlice});
const bobKey = await getPublicKey({family: 0, lnd: lndBob});

// Prepare for a chan that the initiator cannot cooperatively close for n blocks
const {id} = await prepareForChannelProposal({
  cooperative_close_delay: 144,
  lnd: lndAlice,
  key_index: aliceKey.index,
  remote_key: bobKey.public_key,
  transaction_id: transactionId, // Form an outpoint paying to 2:2 of above keys
  transaction_vout: transactionVout,
});

// Propose a channel that cannot be cooperatively closed for n blocks
await proposeChannel({
  id,
  capacity: 1000000, // Outpoint value
  cooperative_close_delay: 144,
  key_index: bobKey.index,
  lnd: lndBob,
  partner_public_key: (await getIdentity({lnd: lndAlice})).public_key,
  remote_key: aliceKey.public_key,
  transaction_id: transactionId, // Form an outpoint paying to 2:2 of above keys
  transaction_vout: transactionVout,
});
```

### recoverFundsFromChannel

Verify and restore a channel from a single channel backup

Requires `offchain:write` permission

    {
      backup: <Backup Hex String>
      lnd: <Authenticated LND API Object>
    }

    @returns via cbk or Promise

Example:

```node
const {getBackup, recoverFundsFromChannel} = require('ln-service');
const {backup} = await getBackup({lnd, transaction_id: id, transaction_vout: i});
await recoverFundsFromChannel({backup, lnd});
```

### recoverFundsFromChannels

Verify and restore channels from a multi-channel backup

Requires `offchain:write` permission

    {
      backup: <Backup Hex String>
      lnd: <Authenticated LND API Object>
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

Requires `peers:remove` permission

    {
      lnd: <Authenticated LND API Object>
      public_key: <Public Key Hex String>
    }

    @returns via cbk or Promise

Example:

```node
const {removePeer} = require('ln-service');
const connectedPeerPublicKey = 'nodePublicKeyHexString';
await removePeer({lnd, public_key: connectedPeerPublicKey});
```

### restrictMacaroon

Restrict an access macaroon

    {
      [expires_at]: <Expires At ISO 8601 Date String>
      [ip]: <IP Address String>
      macaroon: <Base64 Encoded Macaroon String>
    }

    @throws
    <Error>

    @returns
    {
      macaroon: <Restricted Base64 Encoded Macaroon String>
    }

Example:

```node
const {restrictMacaroon} = require('ln-service');

// Limit a macaroon to be only usable on localhost
const restrictedMacaroon = restrictMacaroon({ip: '127.0.0.1', macaroon}).macaroon;
```

### revokeAccess

Revoke an access token given out in the past

Note: this method is not supported in LND versions 0.11.0 and below

Requires `macaroon:write` permission

    {
      id: <Access Token Macaroon Root Id Positive Integer String>
      lnd: <Authenticated LND API Object>
    }

    @returns via cbk or Promise

Example:

```node
const {grantAccess, revokeAccess} = require('ln-service');

// Create a macaroon that can be used to make off-chain payments
const {macaroon} = await grantAccess({lnd, id: '1', is_ok_to_pay: true});

// Revoke the access granted to the id
await revokeAccess({lnd, id: '1'})

// The macaroon and any others on the same id can no longer be used
```

### routeFromChannels

Get a route from a sequence of channels

Either next hop destination in channels or final destination is required

    {
      channels: [{
        capacity: <Maximum Tokens Number>
        [destination]: <Next Node Public Key Hex String>
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
      [cltv_delta]: <Final CLTV Delta Number>
      [destination]: <Destination Public Key Hex String>
      height: <Current Block Height Number>
      [messages]: [{
        type: <Message Type Number String>
        value: <Message Raw Value Hex Encoded String>
      }]
      mtokens: <Millitokens To Send String>
      [payment]: <Payment Identification Value Hex String>
      [total_mtokens]: <Sum of Shards Millitokens String>
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
        [messages]: [{
          type: <Message Type Number String>
          value: <Message Raw Value Hex Encoded String>
        }]
        mtokens: <Total Fee-Inclusive Millitokens String>
        [payment]: <Payment Identification Value Hex String>
        timeout: <Timeout Block Height Number>
        tokens: <Total Fee-Inclusive Tokens Number>
        [total_mtokens]: <Sum of Shards Millitokens String>
      }
    }

Example:

```node
const {getChannel, getChannels, routeFromChannels} = require('ln-service');
const {getHeight} = require('ln-service');
const [{id}] = await getChannels({lnd});
const channels = [(await getChannel({lnd, id}))];
const destination = 'destinationNodePublicKeyHexString';
const height = (await getHeight({lnd})).current_block_height;
const mtokens = '1000';
const res = routeFromChannels({channels, destination, height, mtokens});
const {route} = res;
```

### sendToChainAddress

Send tokens in a blockchain transaction.

Requires `onchain:write` permission

`utxo_confirmations` is not supported on LND 0.11.1 or below

    {
      address: <Destination Chain Address String>
      [description]: <Transaction Label String>
      [fee_tokens_per_vbyte]: <Chain Fee Tokens Per Virtual Byte Number>
      [is_send_all]: <Send All Funds Bool>
      lnd: <Authenticated LND API Object>
      [log]: <Log Function>
      [target_confirmations]: <Confirmations To Wait Number>
      tokens: <Tokens To Send Number>
      [utxo_confirmations]: <Minimum Confirmations for UTXO Selection Number>
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
await sendToChainAddress({address, lnd, tokens});
```

### sendToChainAddresses

Send tokens to multiple destinations in a blockchain transaction.

Requires `onchain:write` permission

`utxo_confirmations` is not supported on LND 0.11.1 or below

    {
      [description]: <Transaction Label String>
      [fee_tokens_per_vbyte]: <Chain Fee Tokens Per Virtual Byte Number>
      lnd: <Authenticated LND API Object>
      [log]: <Log Function>
      send_to: [{
        address: <Address String>
        tokens: <Tokens Number>
      }]
      [target_confirmations]: <Confirmations To Wait Number>
      [utxo_confirmations]: <Minimum Confirmations for UTXO Selection Number>
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

Permissions `info:read`, `offchain:write`, `onchain:write` are required

    {
      [candidate_nodes]: [{
        public_key: <Node Public Key Hex String>
        score: <Score Number>
      }]
      [is_enabled]: <Enable Autopilot Bool>
      lnd: <Authenticated LND Object>
    }

    @returns via cbk or Promise

Example:

```node
const {setAutopilot} = require('ln-service');
await setAutopilot({is_enabled: false, lnd});
```

### settleHodlInvoice

Settle HODL invoice

Requires LND built with `invoicesrpc` build tag

Requires `invoices:write` permission

    {
      lnd: <Authenticated LND API Object>
      secret: <Payment Preimage Hex String>
    }

    @returns via cbk or Promise

Example:

```node
const {randomBytes} = require('crypto');
const {settleHodlInvoice} = require('ln-service');

const secret = randomBytes(32).toString('hex');

// Use the sha256 hash of that secret as the id of a createHodlInvoice

// Wait for the invoice to be held (subscribeToInvoice) and then settle:
await settleHodlInvoice({lnd, secret});
```

### signBytes

Sign a sha256 hash of arbitrary bytes

Requires LND built with `signrpc` build tag

Requires `signer:generate` permission

    {
      key_family: <Key Family Number>
      key_index: <Key Index Number>
      lnd: <Authenticated LND gRPC API Object>
      preimage: <Bytes To Hash and Sign Hex Encoded String>
    }

    @returns via cbk or Promise
    {
      signature: <Signature Hex String>
    }

Example:

```node
const {signBytes} = require('ln-service');

// Get signature for preimage using node identity key
const {signature} = await signBytes({
  lnd,
  key_family: 6,
  key_index: 0,
  preimage: '00',
});
```

### signMessage

Sign a message

Requires `message:write` permission

    {
      lnd: <Authenticated LND API Object>
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

### signPsbt

Sign a PSBT to produce a finalized PSBT that is ready to broadcast

Requires `onchain:write` permission

Requires LND built with `walletrpc` tag

This method is not supported in LND 0.11.1 and below

    {
      lnd: <Authenticated LND API Object>
      psbt: <Funded PSBT Hex String>
    }

    @returns via cbk or Promise
    {
      psbt: <Finalized PSBT Hex String>
      transaction: <Signed Raw Transaction Hex String>
    }

Example:

```node
const {fundPsbt, signPsbt} = require('ln-service');

const address = 'chainAddress';
const tokens = 1000000;

// Create an unsigned PSBT that sends 1mm to a chain address
const {psbt} = await fundPsbt({lnd, outputs: [{address, tokens}]});

// Get a fully signed transaction from the unsigned PSBT
const {transaction} = await signPsbt({lnd, psbt});
```

### signTransaction

Sign transaction

Requires LND built with `signerrpc` build tag

Requires `signer:generate` permission

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
      lnd: <Authenticated LND API Object>
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

Requires `info:write` permission

    {
      lnd: <Authenticated LND API Object>
    }

    @returns via cbk or Promise

Example:

```node
const {stopDaemon} = require('ln-service');
await stopDaemon({lnd});
```

### subscribeToBackups

Subscribe to backup snapshot updates

Requires `offchain:read` permission

    {
      lnd: <Authenticated LND API Object>
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
const {subscribeToBackups} = require('ln-service');
const sub = subscribeToBackups({lnd});
let currentBackup;
sub.on('backup', ({backup}) => currentBackup = backup);
```

### subscribeToBlocks

Subscribe to blocks

Requires LND built with `chainrpc` build tag

Requires `onchain:read` permission

    {
      lnd: <Authenticated LND Object>
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

One and only one chain address or output script is required

Requires LND built with `chainrpc` build tag

Requires `onchain:read` permission

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

A chain address or raw output script is required

Requires LND built with `chainrpc` build tag

Requires `onchain:read` permission

    {
      [bech32_address]: <Bech32 P2WPKH or P2WSH Address String>
      lnd: <Authenticated LND API Object>
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
sub.on('confirmation', ({height}) => confirmationHeight = height);
```

### subscribeToChannels

Subscribe to channel updates

Requires `offchain:read` permission

    {
      lnd: <Authenticated LND API Object>
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
      [close_balance_spent_by]: <Channel Balance Output Spent By Tx Id String>
      [close_balance_vout]: <Channel Balance Close Tx Output Index Number>
      [close_confirm_height]: <Channel Close Confirmation Height Number>
      close_payments: [{
        is_outgoing: <Payment Is Outgoing Bool>
        is_paid: <Payment Is Claimed With Preimage Bool>
        is_pending: <Payment Resolution Is Pending Bool>
        is_refunded: <Payment Timed Out And Went Back To Payer Bool>
        [spent_by]: <Close Transaction Spent By Transaction Id Hex String>
        tokens: <Associated Tokens Number>
        transaction_id: <Transaction Id Hex String>
        transaction_vout: <Transaction Output Index Number>
      }]
      [close_transaction_id]: <Closing Transaction Id Hex String>
      final_local_balance: <Channel Close Final Local Balance Tokens Number>
      final_time_locked_balance: <Closed Channel Timelocked Tokens Number>
      [id]: <Closed Standard Format Channel Id String>
      is_breach_close: <Is Breach Close Bool>
      is_cooperative_close: <Is Cooperative Close Bool>
      is_funding_cancel: <Is Funding Cancelled Close Bool>
      is_local_force_close: <Is Local Force Close Bool>
      [is_partner_closed]: <Channel Was Closed By Channel Peer Bool>
      [is_partner_initiated]: <Channel Was Initiated By Channel Peer Bool>
      is_remote_force_close: <Is Remote Force Close Bool>
      partner_public_key: <Partner Public Key Hex String>
      transaction_id: <Channel Funding Transaction Id Hex String>
      transaction_vout: <Channel Funding Output Index Number>
    }

    @event 'channel_opened'
    {
      capacity: <Channel Token Capacity Number>
      commit_transaction_fee: <Commit Transaction Fee Number>
      commit_transaction_weight: <Commit Transaction Weight Number>
      [cooperative_close_address]: <Coop Close Restricted to Address String>
      [cooperative_close_delay_height]: <Prevent Coop Close Until Height Number>
      id: <Standard Format Channel Id String>
      is_active: <Channel Active Bool>
      is_closing: <Channel Is Closing Bool>
      is_opening: <Channel Is Opening Bool>
      is_partner_initiated: <Channel Partner Opened Channel Bool>
      is_private: <Channel Is Private Bool>
      is_static_remote_key: <Remote Key Is Static Bool>
      local_balance: <Local Balance Tokens Number>
      [local_given]: <Local Initially Pushed Tokens Number>
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
      [remote_given]: <Remote Initially Pushed Tokens Number>
      remote_reserve: <Remote Reserved Tokens Number>
      sent: <Sent Tokens Number>
      transaction_id: <Blockchain Transaction Id String>
      transaction_vout: <Blockchain Transaction Vout Number>
      unsettled_balance: <Unsettled Balance Tokens Number>
    }

    @event 'channel_opening'
    {
      transaction_id: <Blockchain Transaction Id Hex String>
      transaction_vout: <Blockchain Transaction Output Index Number>
    }

Example:

```node
const {once} = require('events');
const {subscribeToChannels} = require('ln-service');
const sub = subscribeToChannels({lnd});
const [openedChannel] = await once(sub, 'channel_opened');
```

### subscribeToForwardRequests

Subscribe to requests to forward payments

Note that the outbound channel is only the requested channel, another may be
selected internally to complete the forward.

Requires `offchain:read`, `offchain:write` permission

`onion` is not supported in LND 0.11.1 and below

    {
      lnd: <Authenticated LND API Object>
    }

    @throws
    <Error>

    @returns
    <EventEmitter Object>

    @event 'forward_request`
    {
      accept: () => {}
      cltv_delta: <Difference Between Out and In CLTV Height Number>
      fee: <Routing Fee Tokens Rounded Down Number>
      fee_mtokens: <Routing Fee Millitokens String>
      hash: <Payment Hash Hex String>
      in_channel: <Inbound Standard Format Channel Id String>
      in_payment: <Inbound Channel Payment Id Number>
      messages: [{
        type: <Message Type Number String>
        value: <Raw Value Hex String>
      }]
      mtokens: <Millitokens to Forward To Next Peer String>
      [onion]: <Hex Serialized Next-Hop Onion Packet To Forward String>
      out_channel: <Requested Outbound Channel Standard Format Id String>
      reject: <Reject Forward Function> () => {}
      settle: <Short Circuit Function> ({secret: <Preimage Hex String}) => {}
      timeout: <CLTV Timeout Height Number>
      tokens: <Tokens to Forward to Next Peer Rounded Down Number>
    }

Example:

```node
const {subscribeToForwardRequests} = require('ln-service');
const sub = subscribeToForwardRequests({lnd});

sub.on('forward_request', forward => {
  // Fail all forward requests
  return forward.reject();
});
```

### subscribeToForwards

Subscribe to HTLC events

Requires `offchain:read` permission

    {
      lnd: <Authenticated LND API Object>
    }

    @throws
    <Error>

    @returns
    <Subscription EventEmitter Object>

    @event 'error'
    <Error Object>

    @event 'forward'
    {
      at: <Forward Update At ISO 8601 Date String>
      [external_failure]: <Public Failure Reason String>
      [in_channel]: <Inbound Standard Format Channel Id String>
      [in_payment]: <Inbound Channel Payment Id Number>
      [internal_failure]: <Private Failure Reason String>
      is_confirmed: <Forward Is Confirmed Bool>
      is_failed: <Forward Is Failed Bool>
      is_receive: <Is Receive Bool>
      is_send: <Is Send Bool>
      [mtokens]: <Sending Millitokens Number>
      [out_channel]: <Outgoing Standard Format Channel Id String>
      [out_payment]: <Outgoing Channel Payment Id Number>
      [timeout]: <Forward Timeout at Height Number>
      [tokens]: <Sending Tokens Number>
    }

Example:

```node
const {subscribeToForwards} = require('ln-service');
const sub = subscribeToForwards({lnd});

const confirmedForwards = [];

sub.on('forward', forward => {
  if (!forward.is_confirmed) {
    return;
  }

  return confirmedForwards.push(forward);
});
```

### subscribeToGraph

Subscribe to graph updates

Requires `info:read` permission

    {
      lnd: <Authenticated LND API Object>
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
      fee_rate: <Channel Fee Rate In Millitokens Per Million Number>
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
      [capacity]: <Channel Capacity Tokens Number>
      close_height: <Channel Close Confirmed Block Height Number>
      id: <Standard Format Channel Id String>
      [transaction_id]: <Channel Transaction Id String>
      [transaction_vout]: <Channel Transaction Output Index Number>
      updated_at: <Update Received At ISO 8601 Date String>
    }

    @event 'error'
    <Subscription Error>

    @event 'node_updated'
    {
      alias: <Node Alias String>
      color: <Node Color String>
      features: [{
        bit: <BOLT 09 Feature Bit Number>
        is_known: <Feature is Known Bool>
        is_required: <Feature Support is Required Bool>
        type: <Feature Type String>
      }]
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

LND built with `invoicesrpc` tag is required

Requires `invoices:read` permission

    {
      id: <Invoice Payment Hash Hex String>
      lnd: <Authenticated LND API Object>
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
      features: [{
        bit: <BOLT 09 Feature Bit Number>
        is_known: <Feature is Known Bool>
        is_required: <Feature Support is Required To Pay Bool>
        type: <Feature Type String>
      }]
      id: <Payment Hash String>
      [is_canceled]: <Invoice is Canceled Bool>
      is_confirmed: <Invoice is Confirmed Bool>
      [is_held]: <HTLC is Held Bool>
      is_outgoing: <Invoice is Outgoing Bool>
      is_private: <Invoice is Private Bool>
      mtokens: <Invoiced Millitokens String>
      payments: [{
        [confirmed_at]: <Payment Settled At ISO 8601 Date String>
        created_at: <Payment Held Since ISO 860 Date String>
        created_height: <Payment Held Since Block Height Number>
        in_channel: <Incoming Payment Through Channel Id String>
        is_canceled: <Payment is Canceled Bool>
        is_confirmed: <Payment is Confirmed Bool>
        is_held: <Payment is Held Bool>
        messages: [{
          type: <Message Type Number String>
          value: <Raw Value Hex String>
        }]
        mtokens: <Incoming Payment Millitokens String>
        [pending_index]: <Pending Payment Channel HTLC Index Number>
        tokens: <Payment Tokens Number>
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

Requires `invoices:read` permission

    {
      lnd: <Authenticated LND API Object>
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
      features: [{
        bit: <Feature Bit Number>
        is_known: <Is Known Feature Bool>
        is_required: <Feature Is Required Bool>
        name: <Feature Name String>
      }]
      id: <Invoice Payment Hash Hex String>
      is_confirmed: <Invoice is Confirmed Bool>
      is_outgoing: <Invoice is Outgoing Bool>
      [is_push]: <Invoice is Push Payment Bool>
      payments: [{
        [confirmed_at]: <Payment Settled At ISO 8601 Date String>
        created_at: <Payment Held Since ISO 860 Date String>
        created_height: <Payment Held Since Block Height Number>
        in_channel: <Incoming Payment Through Channel Id String>
        is_canceled: <Payment is Canceled Bool>
        is_confirmed: <Payment is Confirmed Bool>
        is_held: <Payment is Held Bool>
        messages: [{
          type: <Message Type Number String>
          value: <Raw Value Hex String>
        }]
        mtokens: <Incoming Payment Millitokens String>
        [pending_index]: <Pending Payment Channel HTLC Index Number>
        tokens: <Payment Tokens Number>
        [total_mtokens]: <Total Payment Millitokens String>
      }]
      received: <Received Tokens Number>
      received_mtokens: <Received Millitokens String>
      [request]: <BOLT 11 Payment Request String>
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

Requires `offchain:write`, `onchain:write` permissions

Note: listening to inbound channel requests will automatically fail all
channel requests after a short delay.

To return to default behavior of accepting all channel requests, remove all
listeners to `channel_request`

LND 0.11.1 and below do not support `accept` or `reject` arguments

    {
      lnd: <Authenticated LND API Object>
    }

    @throws
    <Error>

    @returns
    <EventEmitter Object>

    @event 'channel_request'
    {
      accept: <Accept Request Function> ({
        [cooperative_close_address]: <Restrict Coop Close To Address String>
        [min_confirmations]: <Required Confirmations Before Channel Open Number>
        [remote_csv]: <Peer Unilateral Balance Output CSV Delay Number>
        [remote_reserve]: <Minimum Tokens Peer Must Keep On Their Side Number>
        [remote_max_htlcs]: <Maximum Slots For Attaching HTLCs Number>
        [remote_max_pending_mtokens]: <Maximum HTLCs Value Millitokens String>
        [remote_min_htlc_mtokens]: <Minimium HTLC Value Millitokens String>
      }) -> {}
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
      reject: <Reject Request Function> ({
        [reason]: <500 Character Limited Rejection Reason String>
      }) -> {}
    }

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

Requires `offchain:read` permission

    {
      id: <Payment Request Hash Hex String>
      lnd: <Authenticated LND API Object>
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
        fee: <Routing Fee Tokens Number>
        fee_mtokens: <Fee Millitokens String>
        forward: <Forwarded Tokens Number>
        forward_mtokens: <Forward Millitokens String>
        public_key: <Public Key Hex String>
        timeout: <Timeout Block Height Number>
      }]
      id: <Payment Hash Hex String>
      mtokens: <Total Millitokens Paid String>
      safe_fee: <Payment Forwarding Fee Rounded Up Tokens Number>
      safe_tokens: <Payment Tokens Rounded Up Number>
      secret: <Payment Preimage Hex String>
      timeout: <Expiration Block Height Number>
      tokens: <Tokens Paid Number>
    }

    @event 'failed'
    {
      is_insufficient_balance: <Failed Due To Lack of Balance Bool>
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

Requires `offchain:write` permission

    {
      [cltv_delta]: <Final CLTV Delta Number>
      destination: <Destination Public Key String>
      [features]: [{
        bit: <Feature Bit Number>
      }]
      [id]: <Payment Request Hash Hex String>
      [incoming_peer]: <Pay Through Specific Final Hop Public Key Hex String>
      lnd: <Authenticated LND gRPC API Object>
      [max_fee]: <Maximum Fee Tokens To Pay Number>
      [max_fee_mtokens]: <Maximum Fee Millitokens to Pay String>
      [max_paths]: <Maximum Simultaneous Paths Number>
      [max_timeout_height]: <Maximum Height of Payment Timeout Number>
      [messages]: [{
        type: <Message Type Number String>
        value: <Message Raw Value Hex Encoded String>
      }]
      [mtokens]: <Millitokens to Pay String>
      [outgoing_channel]: <Pay Out of Outgoing Channel Id String>
      [outgoing_channels]: [<Pay Out of Outgoing Channel Ids String>]
      [pathfinding_timeout]: <Time to Spend Finding a Route Milliseconds Number>
      [routes]: [[{
        [base_fee_mtokens]: <Base Routing Fee In Millitokens String>
        [channel]: <Standard Format Channel Id String>
        [cltv_delta]: <CLTV Blocks Delta Number>
        [fee_rate]: <Fee Rate In Millitokens Per Million Number>
        public_key: <Forward Edge Public Key Hex String>
      }]]
      [tokens]: <Tokens to Pay Number>
    }

    @throws
    <Error>

    @returns
    <Subscription EventEmitter Object>

    @event 'confirmed'
    {
      fee: <Fee Tokens Paid Number>
      fee_mtokens: <Total Fee Millitokens Paid String>
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
      safe_fee: <Payment Forwarding Fee Rounded Up Tokens Number>
      safe_tokens: <Payment Tokens Rounded Up Number>
      secret: <Payment Preimage Hex String>
      tokens: <Total Tokens Paid Rounded Down Number>
    }

    @event 'failed'
    {
      is_insufficient_balance: <Failed Due To Lack of Balance Bool>
      is_invalid_payment: <Failed Due to Invalid Payment Bool>
      is_pathfinding_timeout: <Failed Due to Pathfinding Timeout Bool>
      is_route_not_found: <Failed Due to Route Not Found Bool>
      [route]: {
        fee: <Route Total Fee Tokens Rounded Down Number>
        fee_mtokens: <Route Total Fee Millitokens String>
        hops: [{
          channel: <Standard Format Channel Id String>
          channel_capacity: <Channel Capacity Tokens Number>
          fee: <Hop Forwarding Fee Rounded Down Tokens Number>
          fee_mtokens: <Hop Forwarding Fee Millitokens String>
          forward: <Hop Forwarding Tokens Rounded Down Number>
          forward_mtokens: <Hop Forwarding Millitokens String>
          public_key: <Hop Sending To Public Key Hex String>
          timeout: <Hop CTLV Expiration Height Number>
        }]
        mtokens: <Payment Sending Millitokens String>
        safe_fee: <Payment Forwarding Fee Rounded Up Tokens Number>
        safe_tokens: <Payment Sending Tokens Rounded Up Number>
        timeout: <Payment CLTV Expiration Height Number>
        tokens: <Payment Sending Tokens Rounded Down Number>
      }
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

Initiate and subscribe to the outcome of a payment request

Requires `offchain:write` permission

    {
      [incoming_peer]: <Pay Through Specific Final Hop Public Key Hex String>
      lnd: <Authenticated LND API Object>
      [max_fee]: <Maximum Fee Tokens To Pay Number>
      [max_fee_mtokens]: <Maximum Fee Millitokens to Pay String>
      [max_paths]: <Maximum Simultaneous Paths Number>
      [max_timeout_height]: <Maximum Height of Payment Timeout Number>
      [messages]: [{
        type: <Message Type Number String>
        value: <Message Raw Value Hex Encoded String>
      }]
      [mtokens]: <Millitokens to Pay String>
      [outgoing_channel]: <Pay Out of Outgoing Channel Id String>
      [outgoing_channels]: [<Pay Out of Outgoing Channel Ids String>]
      [pathfinding_timeout]: <Time to Spend Finding a Route Milliseconds Number>
      request: <BOLT 11 Payment Request String>
      [tokens]: <Tokens To Pay Number>
    }

    @throws
    <Error>

    @returns
    <Subscription EventEmitter Object>

    @event 'confirmed'
    {
      fee: <Fee Tokens Number>
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
      mtokens: <Total Millitokens Paid String>
      safe_fee: <Payment Forwarding Fee Rounded Up Tokens Number>
      safe_tokens: <Payment Tokens Rounded Up Number>
      secret: <Payment Preimage Hex String>
      timeout: <Expiration Block Height Number>
      tokens: <Total Tokens Paid Number>
    }

    @event 'failed'
    {
      is_insufficient_balance: <Failed Due To Lack of Balance Bool>
      is_invalid_payment: <Failed Due to Invalid Payment Bool>
      is_pathfinding_timeout: <Failed Due to Pathfinding Timeout Bool>
      is_route_not_found: <Failed Due to Route Not Found Bool>
      [route]: {
        fee: <Route Total Fee Tokens Rounded Down Number>
        fee_mtokens: <Route Total Fee Millitokens String>
        hops: [{
          channel: <Standard Format Channel Id String>
          channel_capacity: <Channel Capacity Tokens Number>
          fee: <Hop Forwarding Fee Rounded Down Tokens Number>
          fee_mtokens: <Hop Forwarding Fee Millitokens String>
          forward: <Hop Forwarding Tokens Rounded Down Number>
          forward_mtokens: <Hop Forwarding Millitokens String>
          public_key: <Hop Sending To Public Key Hex String>
          timeout: <Hop CTLV Expiration Height Number>
        }]
        mtokens: <Payment Sending Millitokens String>
        safe_fee: <Payment Forwarding Fee Rounded Up Tokens Number>
        safe_tokens: <Payment Sending Tokens Rounded Up Number>
        timeout: <Payment CLTV Expiration Height Number>
        tokens: <Payment Sending Tokens Rounded Down Number>
      }
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

Requires `offchain:write` permission

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
        [messages]: [{
          type: <Message Type Number String>
          value: <Message Raw Value Hex Encoded String>
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
            fee_rate: <Fees Charged in Millitokens Per Million Number>
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
        fee_rate: <Fees Charged in Millitokens Per Million Number>
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
      safe_fee: <Payment Forwarding Fee Rounded Up Tokens Number>
      safe_tokens: <Payment Tokens Rounded Up Number>
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
      safe_fee: <Payment Forwarding Fee Rounded Up Tokens Number>
      safe_tokens: <Payment Tokens Rounded Up Number>
      secret: <Payment Secret Preimage Hex String>
      tokens: <Total Tokens Sent Number>
    }

Example:

```node
const {once} = require('events');
const {getRouteToDestination, subscribeToPayViaRoutes} = require('ln-service');
const {route} = getRouteToDestination({destination, lnd, tokens});
const sub = subscribeToPayViaRoutes({lnd, routes: [route]});
const [success] = await once(sub, 'success');
```

### subscribeToPeers

Subscribe to peer connectivity events

Requires `peers:read` permission

    {
      lnd: <Authenticated LND gRPC API Object>
    }

    @throws
    <Error>

    @returns
    <EventEmitter Object>

    @event 'connected'
    {
      public_key: <Connected Peer Public Key Hex String>
    }

    @event 'disconnected'
    {
      public_key: <Disconnected Peer Public Key Hex String>
    }

Example:

```node
const {subscribeToPeers} = require('ln-service');

const sub = subscribeToPeers({lnd});

let lastConnectedPeer;

// Listen to connected peers
sub.on('connected', peer => lastConnected = peer.public_key);
```

### subscribeToProbeForRoute

Subscribe to a probe attempt

Requires `offchain:write` permission

    {
      [cltv_delta]: <Final CLTV Delta Number>
      destination: <Destination Public Key Hex String>
      [features]: [{
        bit: <Feature Bit Number>
      }]
      [ignore]: [{
        from_public_key: <Public Key Hex String>
        [to_public_key]: <To Public Key Hex String>
      }]
      [incoming_peer]: <Incoming Peer Public Key Hex String>
      lnd: <Authenticated LND API Object>
      [max_fee]: <Maximum Fee Tokens Number>
      [max_fee_mtokens]: <Maximum Fee Millitokens to Probe String>
      [max_timeout_height]: <Maximum CLTV Timeout Height Number>
      [messages]: [{
        type: <Message To Final Destination Type Number String>
        value: <Message To Final Destination Raw Value Hex Encoded String>
      }]
      [mtokens]: <Millitokens to Probe String>
      [outgoing_channel]: <Outgoing Channel Id String>
      [path_timeout_ms]: <Skip Individual Path Attempt After Milliseconds Number>
      [payment]: <Payment Identifier Hex String>
      [probe_timeout_ms]: <Fail Entire Probe After Milliseconds Number>
      [routes]: [[{
        [base_fee_mtokens]: <Base Routing Fee In Millitokens Number>
        [channel_capacity]: <Channel Capacity Tokens Number>
        [channel]: <Standard Format Channel Id String>
        [cltv_delta]: <CLTV Blocks Delta Number>
        [fee_rate]: <Fee Rate In Millitokens Per Million Number>
        public_key: <Forward Edge Public Key Hex String>
      }]]
      [tokens]: <Tokens to Probe Number>
      [total_mtokens]: <Total Millitokens Across Paths String>
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
        [messages]: [{
          type: <Message Type Number String>
          value: <Message Raw Value Hex Encoded String>
        }]
        mtokens: <Total Millitokens To Pay String>
        [payment]: <Payment Identifier Hex String>
        safe_fee: <Payment Forwarding Fee Rounded Up Tokens Number>
        safe_tokens: <Payment Sent Tokens Rounded Up Number>
        timeout: <Expiration Block Height Number>
        tokens: <Total Tokens To Pay Number>
        [total_mtokens]: <Total Millitokens String>
      }
    }

    @event 'probing'
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
        [messages]: [{
          type: <Message Type Number String>
          value: <Message Raw Value Hex Encoded String>
        }]
        mtokens: <Total Millitokens To Pay String>
        [payment]: <Payment Identifier Hex String>
        safe_fee: <Payment Forwarding Fee Rounded Up Tokens Number>
        safe_tokens: <Payment Sent Tokens Rounded Up Number>
        timeout: <Expiration Block Height Number>
        tokens: <Total Tokens To Pay Number>
        [total_mtokens]: <Total Millitokens String>
      }
    }

    @event 'routing_failure'
    {
      [channel]: <Standard Format Channel Id String>
      [mtokens]: <Millitokens String>
      [policy]: {
        base_fee_mtokens: <Base Fee Millitokens String>
        cltv_delta: <Locktime Delta Number>
        fee_rate: <Fees Charged in Millitokens Per Million Number>
        [is_disabled]: <Channel is Disabled Bool>
        max_htlc_mtokens: <Maximum HLTC Millitokens Value String>
        min_htlc_mtokens: <Minimum HTLC Millitokens Value String>
      }
      public_key: <Public Key Hex String>
      reason: <Failure Reason String>
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
        [messages]: [{
          type: <Message Type Number String>
          value: <Message Raw Value Hex Encoded String>
        }]
        mtokens: <Total Millitokens To Pay String>
        [payment]: <Payment Identifier Hex String>
        safe_fee: <Payment Forwarding Fee Rounded Up Tokens Number>
        safe_tokens: <Payment Sent Tokens Rounded Up Number>
        timeout: <Expiration Block Height Number>
        tokens: <Total Tokens To Pay Number>
        [total_mtokens]: <Total Millitokens String>
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
const {subscribeToProbeForRoute} = require('ln-service');
const destination = 'destinationPublicKeyHexString';
const sub = subscribeToProbeForRoute({destination, lnd, tokens: 80085});
const [{route}] = await once(sub, 'probe_success');
```

### subscribeToTransactions

Subscribe to transactions

Requires `onchain:read` permission

    {
      lnd: <Authenticated LND API Object>
    }

    @throws
    <Error>

    @returns
    <EventEmitter Object>

    @event 'chain_transaction'
    {
      [block_id]: <Block Hash String>
      [confirmation_count]: <Confirmation Count Number>
      [confirmation_height]: <Confirmation Block Height Number>
      created_at: <Created ISO 8601 Date String>
      [fee]: <Fees Paid Tokens Number>
      id: <Transaction Id String>
      is_confirmed: <Is Confirmed Bool>
      is_outgoing: <Transaction Outbound Bool>
      output_addresses: [<Address String>]
      tokens: <Tokens Including Fee Number>
      [transaction]: <Raw Transaction Hex String>
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

### unlockUtxo

Unlock UTXO

Requires `onchain:write` permission

Requires LND built with `walletrpc` build tag

    {
      id: <Lock Id Hex String>
      lnd: <Authenticated LND gRPC API Object>
      transaction_id: <Unspent Transaction Id Hex String>
      transaction_vout: <Unspent Transaction Output Index Number>
    }

    @returns via cbk or Promise

Example:

```node
const {getUtxos, lockUtxo, sendToChainAddress, unlockUtxo} = require('ln-service');

// Assume a wallet that has only one UTXO
const [utxo] = (await getUtxos({lnd})).utxos;

const locked = await lockUtxo({
  lnd,
  transaction_id: utxo.transaction_id,
  transaction_vout: utxo.transaction_vout,
});

const futureUnlockDate = new Date(locked.expires_at);

try {
  // This call will throw an error as LND will treat the UTXO as being locked
  await sendToChainAddress({address, lnd, tokens});
} catch (err) {
  // Insufficient funds
}

await unlockUtxo({
  lnd,
  id: locked.id,
  transaction_id: utxo.transaction_id,
  transaction_vout: utxo.transaction_vout,
});

// This call will now succeed as LND will treat the UTXO as being unlocked
await sendToChainAddress({address, lnd, tokens});
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

### updateChainTransaction

Update an on-chain transaction record metadata

Requires LND built with `walletrpc` build tag

Requires `onchain:write` permission

    {
      description: <Transaction Label String>
      id: <Transaction Id Hex String>
      lnd: <Authenticated LND API Object>
    }

    @returns via cbk or Promise

Example:

```node
const {getChainTransactions} = require('ln-service');

const {transactions} = await getChainTransactions({lnd});

const [{id}] = transactions;

await updateChainTransaction({id, lnd, description: 'First transaction'});
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

Setting both `base_fee_tokens` and `base_fee_mtokens` is not supported

    {
      [base_fee_mtokens]: <Base Fee Millitokens Charged Number>
      [base_fee_tokens]: <Base Fee Tokens Charged Number>
      [cltv_delta]: <HTLC CLTV Delta Number>
      [fee_rate]: <Fee Rate In Millitokens Per Million Number>
      lnd: <Authenticated LND gRPC API Object>
      [max_htlc_mtokens]: <Maximum HTLC Millitokens to Forward String>
      [min_htlc_mtokens]: <Minimum HTLC Millitokens to Forward String>
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

### verifyBytesSignature

Verify signature of arbitrary bytes

Requires LND built with `signrpc` build tag

Requires `signer:read` permission

    {
      lnd: <Authenticated LND API Object>
      preimage: <Message Preimage Bytes Hex Encoded String>
      public_key: <Signature Valid For Public Key Hex String>
      signature: <Signature Hex String>
    }

    @returns via cbk or Promise
    {
      is_valid: <Signature is Valid Bool>
    }

Example:

```node
const {getIdentity, signBytes, verifyBytesSignature} = require('ln-service');

const preimage = Buffer.from('hello world').toString('hex');

// Sign the hash of the string "hello world"
const {signature} = await signBytes({lnd, preimage, key_family: 6, key_index: 0});

// Verify that the signature is good for the public key over the preimage
const validity = await verifyBytesSignature({
  lnd,
  preimage,
  signature,
  public_key: (await getIdentity({lnd})).public_key,
});
```

### verifyMessage

Verify a message was signed by a known pubkey

Requires `message:read` permission

    {
      lnd: <Authenticated LND API Object>
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

## Tests

Unit tests:

    $ npm test

Integration tests:

BTCD and LND are required to execute the integration tests.

LND must be compiled with the relevant sub-rpc tags to complete all tests.

    $ npm run all-integration-tests

