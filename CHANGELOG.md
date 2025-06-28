# Versions

## 57.26.0

- `openChannels` add `is_allowing_minimal_reserve` to allow low peer reserve

## 57.25.2

- Add support for LND 0.19.1-beta

## 57.25.1

- Add support for LND 0.19.0-beta

## 57.25.0

- Add support for Testnet4

## 57.24.0

- `closeChannel`: Add `is_graceful_close` option to wait for pending resolution

## 57.23.1

- Add support for LND 0.18.5

## 57.23.0

- `getRoutingFeeEstimate`: Add method to estimate an offchain payment fee

## 57.22.3

- Add support for LND 0.18.4

## 57.22.2

- `createFundedPsbt`: Add support for `change_format` for change address type

## 57.21.0

- `fundPsbt`: Add support for `change_format` to specify change address type

## 57.20.2

- Add support for LND 0.18.3

## 57.20.1

- `payViaPaymentRequest`, `subscribeToPayViaRequest`: Add `index` to response
    for payment offset number in payments set

## 57.19.0

- `createInvoice`: add `is_encrypting_routes` to enable blinded paths feature

- `pay`, `subscribeToPastPayment`, `subscribeToPayViaDetails`,
    `subscribeToPayViaRequest`, `subscribeToPayments`: Add `is_canceled` for
    when the payment loop was explicitly canceled.

## 57.18.0

- `getMinimumRelayFee`: Add method to get the chain backend minimum relay fee

## 57.17.0

- `getFeeRates`: Add support for `inbound_base_discount_mtokens`,
    `inbound_rate_discount` for inbound fee policy discounts

## 57.16.0

- `getClosedChannels`: Add support for anchor resolution status via new
    attributes `anchor_is_confirmed`, `anchor_is_pending`, `anchor_spent_by`,
    and `anchor_vout`

## 57.15.0

- `authenticatedLndGrpc`, `unauthenticatedLndGrpc`: Add `path` to specify the
    protos directory

## 57.14.4

- `getChannel`: Add support for specifying `transaction_id` and
    `transaction_vout` instead of `id`

## 57.13.3

- `getWalletInfo`: Add support for LND 0.18.0
- `subscribeToGraph`: Add support for `inbound_base_discount_mtokens` and
    `inbound_rate_discount`

## 57.12.0

- `createFundedPsbt`: Add method to create a funded PSBT given inputs/outputs

## 57.11.0

- `getChannel`, `getNetworkGraph`, `getNode`: Add
    `inbound_base_discount_mtokens` and `inbound_rate_discount`

## 57.10.2

- `getChainFeeEstimate`: Add default chain fee conf target when none is passed

## 57.10.1

- `closeChannel`, `openChannel`, `sendToChainAddress`, `sendToChainAddresses`:
    Add default chain fee conf target when no chain fee is specified

## 57.10.0

- `getPendingSweeps`: Add method to get the list of pending outpoints to sweep
- `requestBatchedFeeIncrease`: Add method to batch a CPFP sweep of an outpoint

## 57.9.1

- Add support for LND 0.17.5

## 57.9.0

- `fundPsbt`, `getChainFeeEstimate`, `sendToChainAddress`,
    `sendToChainAddresses`, `sendToChainOutputScripts`: Add `utxo_selection` to
    specify preferred coin selection behavior.

## 57.8.1

- `pay` and payment via request methods: disallow features 30/31 from payments

## 57.8.0

- `removeAdvertisedFeature`: Add method to remove a feature bit support ad

## 57.7.1

- `getPendingChannels`: Add support for `close_transaction` to return raw tx

## 57.6.0

- `addAdvertisedFeature`: Add method to advertise a feature bit support

## 57.5.0

- `getSweepTransactions`: Add `after` to scope sweep result set

## 57.4.0

- `getConnectedWatchtowers`: Add `is_taproot` to get P2TR channels

## 57.3.0

- `getConfiguration`: Add method to return configuration information

## 57.2.0

- `deleteChainTransaction`: Add method to delete a chain transaction
- `getChainTransaction`: Add method to get a chain transaction

## 57.1.3

- Add support for LND 0.17.3

## 57.1.2

- Add support for LND 0.17.2

## 57.1.1

- Add support for LND 0.17.1

## 57.1.0

- `getBlockHeader`: Add method to get the header portion of a block

## 57.0.1

- Add support for LND 0.17.0

### Breaking Changes

- End support for node.js 16, require 18 or higher
- Remove method `grpcProxyServer`

## 56.14.0

- `openChannel`: Add `is_allowing_minimal_reserve` to allow no reserve on peer

## 56.13.0

- `openChannels`: Add `is_simplified_taproot` to make a simplified taproot chan

## 56.12.0

- `openChannel`: Add `is_simplified_taproot` to make a simplified taproot chan

## 56.11.1

- `openChannel`: Add `inputs` to select inputs for channel open funding

## 56.10.0

- `createInvoice`, `createHodlInvoice`: Add `routes` to customize the hop hints

## 56.9.0

- `openChannel`: Add `is_trusted_funding` to support skipping confirmation wait

## 56.8.2

- `subscribeToForwards`: Cancel subscription when there are no event listeners

## 56.8.1

- `getPendingChannels`: Add `blocks_until_expiry` for opening funding expiry

## 56.7.1

- `isDestinationPayable`: Correct behavior for passing variations of amounts

## 56.7.0

- `getPendingChannels`: Add `description` to return pending channel description
- `getPendingChannels`: Add `is_private` to show pending channel announcement

## 56.6.0

- `getPendingChannels`: Add `type` to return pending channel type

## 56.5.1

- `getPendingChannels`: Fix returning closing transaction id for waiting close

## 56.5.0

- `getWalletInfo`: Add support for LND 0.16.3

## 56.4.0

- `getChannels`: Add `description` to show the channel description
- `openChannel`, `openChannels`, `proposeChannel`: Add `description` to set
    the channel description
- `subscribeToChannels`: Add `description` to `channel_opened`
- `subscribeToRpcRequests`: Add `description` to `open_channel_request`

## 56.3.1

- `subscribeToPastPayment`, `subscribeToPayViaDetails`,
    `subscribeToPayViaRequest`, `subscribeToPayments`: Add `id` for `failed`
    payment hash

## 56.2.0

- `getChannels`: Add support for `type` to show channel type
- `getWalletInfo`: Add support for LND 0.16.2
- `subscribeToChannels`: Add support for `channel_opened` `type` to show type

## 56.1.0

- `getWalletInfo`: Add support for LND 0.16.1
- `subscribeToOpenRequests`: Add `type` for channel request commitment type

## 56.0.0

### Breaking Changes

- Minimum version of node.js is moved up from 14 to 16

## 55.0.0

- `openChannel`: Add `is_max_funding` to fund a channel maximally
- `subscribeToRpcRequests`: Add support for returning `is_max_funding` in
    `open_channel_request`

### Breaking Changes

- `subscribeToRpcRequests`: `open_channel_request`: `local_tokens` is now an
    optional value

## 54.10.7

- `signChainAddressMessage`: Add method to sign a message given a chain address
- `verifyChainAddressMessage`: Add method to verify a chain address message

## 54.9.2

- `getChainAddresses`: Add method to get the list of chain addresses

## 54.8.0

- `subscribeToRpcRequests`: add `max_tokens_per_vbyte` to RPC close requests

## 54.7.0

- `getBlock`: add `height` to allow fetching a raw block at a specified height

## 54.6.0

- `getBlock`: Add method to retrieve the raw bytes of a block in the chain

## 54.5.0

- `getFailedPayments`, `getInvoices`, `getPayments`, `getPendingPayments`: add
    support for date based filtering with `created_after` and `created_before`
    arguments

## 54.4.1

- `subscribeToRpcRequests`: `open_channel_request` add support for
    `fee_rate`, `base_fee_mtokens`

## 54.3.3

- `getWalletInfo`: Add support for LND 0.15.5

## 54.3.2

- `createUnsignedRequest`: Fix support for empty description requests

## 54.3.0

- `getSettlementStatus`: Add method to lookup received htlc settlement status

## 54.2.6

- `getWalletInfo`: Add support for LND 0.14.5

## 54.2.5

- `getWalletInfo`: Add support for LND 0.15.4

## 54.2.4

- `getWalletInfo`: Add support for LND 0.15.3

## 54.2.2

- `getWalletInfo`: Add support for LND 0.14.4

## 54.2.1

- `getWalletInfo`: Add support for LND 0.15.2

- Due to LND chain sync failure prior to LND 0.15.2, those versions are no
    longer supported

## 54.2.0

- `openChannel`, `openChannels`: Add `base_fee_mtokens`, `fee_rate` to set
    initial routing fee rate.

## 54.1.2

- `subscribeToRpcRequests`: Fix support for LND 0.15.1

## 54.1.1

- `subscribeToPayments`: Add method to listen to all outgoing payments

## 54.0.0

### Breaking Changes

- Versions of Node.js before 14 are no longer supported

## 53.23.0

- `getChainFeeEstimate`: Add support for specifying min `utxo_confirmations`

## 53.22.0

- `parsePaymentRequest`: Add support for parsing payment request metadata

## 53.21.0

- `getLockedUtxos`: Add support for locked UTXO `output_script`, `tokens`

## 53.20.0

- `closeChannel`: Add support for `max_tokens_per_vbyte` to set max fee rate
- `getChainTransactions`: Add `inputs` support for previous outpoints
- `subscribeToTransactions`: Add `inputs` support for previous outpoints

## 53.19.0

- `signBytes`: Add `type` and support for specifying `schnorr` type signing
- `verifyBytesSignature`: Add support for verifying Schnorr signatures

## 53.18.0

- `getChannels`: Add support for `is_trusted_funding` and `other_ids`
- `getClosedChannels`: Add support for `other_ids`
- `getEphemeralChannelIds`: Add method to get other channel ids
- `openChannels`: Add support for `is_trusted_funding` for instant opening
- `subscribeToChannels`: Add support for `is_trusted_funding`, `other_ids`
- `subscribeToOpenRequests`: Add support for `is_trusted_funding`

## 53.17.5

- `signTransaction`: Add `root_hash` to support Taproot signatures with scripts

## 53.16.1

- `getFailedPayments`, `getPayments`, `getPendingPayments`: Remove
    `confirmed_at` date when a payment is not confirmed, add `created_at` and
    `failed_at` dates for attempt start and attempt failed dates.

## 53.16.0

- `beginGroupSigningSession`: Add method to start a MuSig2 signing session
- `endGroupSigningSession`: Add method to complete a MuSig2 signing session
- `updateGroupSigningSession`: Add method to add nonces to a MuSig2 session

## 53.15.0

- `getRouteToDestination`, `isDestinationPayable`, `pay`,
    `payViaPaymentDetails`, `payViaPaymentRequest`, `probeForRoute`,
    `subscribeToPayViaDetails`, `subscribeToPayViaRequest`,
    `subscribeToProbeForRoute` - add support for pathfinding `confidence`

## 53.14.1

- `signTransaction`: Fix multi-input signing for upcoming Taproot API changes

## 53.14.0

- `addExternalSocket`: Add method to add a socket to graph announcements
- `removeExternalSocket`: Add method to remove sockets from graph announcements

## 53.13.0

- `getWalletVersion`: Add support for LND 0.14.3-beta

## 53.12.0

- `updateAlias`: Add method to update the node graph announcement alias
- `updateColor`: Add method to update the node graph announcement color

## 53.11.0

- Use TLV for all hops when sending HTLCs along routes
- `signTransaction`: Add `spending` attribute for specifying external inputs

## 53.10.0

- `createChainAddress`: Add support for creating P2TR addresses
- `getUtxos`: Add support for showing P2TR address types

## 53.9.4

- `getPendingPayments`: Add method to get payments in flight

## 53.8.1

- `fundPsbt`: Fix bip32 key derivation error

## 53.8.0

- `getMasterPublicKeys`: Add method to get bip32 master public keys

## 53.7.3

- `payViaRoutes`, `subscribeToPayViaRoutes`: Add support for relay messages

## 53.6.0

- `partiallySignPsbt`: Add method to add a partial signature to a PSBT

## 53.5.2

- `getPayments`: Correct paging issue that prevented paging through all results

## 53.5.0

- `createWallet`: Add support for returning the admin `macaroon`

## 53.4.2

- `pay`, `payViaPaymentRequest`: Fix support for `outgoing_channels` constraint

## 53.4.0

- `deletePendingChannel`: Add method to remove a stuck pending channel open

## 53.3.0

- `getInvoices`: Add `is_unconfirmed` to filter out canceled/settled invoices

## 53.2.0

- `getPendingChannels`: Add support for channel `capacity`

## 53.1.2

- `openChannels`: Fix `cooperative_close_address` not being set on channels

## 53.1.0

- Add support for LND 0.14.1
- `openChannels`: Add `is_avoiding_broadcast` to avoid all funding broadcast

## 53.0.1

- Removed support for determining the type of channel to support LND 0.14.0.

- `createChainAddress`: Make address format optional and add p2wpkh as default
- `sendToChainOutputScripts`: Fix specification of `fee_tokens_per_vbyte`

### Breaking Changes

- `getChannels`, `getPendingChannels`, `subscribeToChannels`: Remove
    attributes `is_anchor`, `is_static_remote_key`, `is_variable_remote_key`.

## 52.16.1

- `subscribeToPayViaDetails`, `subscribeToPayViaRequest`: Add `paying`,  and
    `routing_failure` events to follow in-flight attempts and encountered routing failures

## 52.15.0

- `getPayment`, `subscribeToPastPayment`: Add `pending` for pending payment details

## 52.14.4

- `probeForRoute`, `subscribeToProbeForRoute`, `subscribeToPayViaRoutes`,
    `payViaRoutes`: When probing (no hash), delete the payment failure record after the probe

## 52.13.0

- Add method `sendMessageToPeer` to send a custom peer message
- Add method `subscribeToPeerMessages` to be notified on custom peer messages

## 52.12.1

- `getFailedPayments`: Add method to get payments that failed

## 52.11.0

- `subscribeToRpcRequests`: Add `id` to provide for explicitly named middleware
- `subscribeToRpcRequests`: Add `is_intercepting_close_channel_requests` for closes
- `subscribeToRpcRequests`: Add `is_intercepting_open_channel_requests` for opens
- `subscribeToRpcRequests`: Add `is_intercepting_pay_via_routes_requests` for route pay

## 52.10.2

- `grantAccess`: Fix support for non-working methods

## 52.10.1

- `getWalletVersion`: Add support for LND v0.13.3-beta

## 52.10.0

- `getChannels`: Add `past_states` to reflect the number of updates
- `subscribeToChannels`: Add `past_states` to reflect to number of updates
- `subscribeToRpcRequests`: Add method to intercept RPC requests and responses

## 52.9.0

- `grantAccess`: Add support for specifying `methods` for permissions

## 52.8.0

- `updateRoutingFees`: Add `failures` to result to indicate failed policy updates

## 52.7.0

- `verifyAccess`: Add method to check if a macaroon is granted permissions

## 52.6.0

- `getPayment`: Add `created_at` to indicate the creation date of the payment
- `getPayment`: Add `request` to indicate serialized payment request
- `subscribeToPastPayment`: Add `created_at` to indicate the creation date of the payment
- `subscribeToPastPayment`: Add `request` to indicate serialized payment request
- `subscribeToPastPayments`: Add `created_at` to indicate the creation date of the payment
- `subscribeToPastPayments`: Add `request` to indicate serialized payment request

## 52.5.0

- `getPayment`: Add `destination` to indicate the destination of the payment
- `subscribeToPastPayment`: Add `destination` to indicate the destination of the payment
- `subscribeToPastPayments`: Add `destination` to indicate the destination of the payment

## 52.4.0

- `deletePayment`: Add method to delete a single payment
- `deleteFailedPayAttempts`: Add `id` argument to delete attempts for a single payment
- `getWalletStatus`: `is_ready`: Add wallet server ready status
- `subscribeToWalletStatus`: Add `ready` event to indicate server ready status

## 52.3.0

- `getPayment`: Add `confirmed_at` to indicate when payment resolved successfully
- `getPayments`: Add `confirmed_at` to indicate when payments resolve successfully
- `pay`: Add `confirmed_at` to indicate when payment resolved successfully
- `payViaPaymentDetails`: Add `confirmed_at` to indicate when payment was sent
- `payViaPaymentRequest`: Add `confirmed_at` to indicate when payment was sent
- `payViaRoutes`: Add `confirmed_at` to indicate when payment resolved successfully
- `subscribeToPastPayment`: Add `confirmed_at` to indicate when payment succeeded
- `subscribeToPastPayments`: Add `confirmed_at` to indicate when payments succeed
- `subscribeToPayViaDetails`: Add `confirmed_at` to indicate when payment was sent
- `subscribeToPayViaRequest`: Add `confirmed_at` to indicate when payment was sent
- `subscribeToPayViaRoutes`: Add `confirmed_at` to indicate when payment was sent

## 52.2.0

- `getPendingChannels`: Add `is_timelocked` and `timelock_blocks` to force closes

## 52.1.0

- `subscribeToPastPayments`: Add method to subscribe to successful past payments

## 52.0.3

- `lockUtxo`: Return correct error message when attempting to lock an unknown UTXO
- `lockUtxo`: Fix error when specifying a custom lock identifier

## 52.0.2

- Switch to `sendToRouteV2` to execute payments over a specific route

## 52.0.1

- `getWalletStatus`: Add method to do a one-off query of the wallet state

### Breaking Changes

- Node.js version 12 or higher is now required

## 51.10.1

- `getWalletVersion`: Add support for LND 0.13.1-beta
- `fundPsbt`: Add support for `min_confirmations`

## 51.9.0

- `subscribeToForwards`: Add `secret` attribute to settle forward events

## 51.8.8

- `getNode`: Return to fallback channels lookup when version commit hash is unavailable
- `getWalletVersion`: Add support for builds that do not report a commit hash

## 51.8.7

- `getNode`: Improve performance on LND 0.13.0+ by using returned channel data

## 51.8.5

Support AMP push payments in invoices

- `parsePaymentRequest`: Return zero values when mtokens are undefined

## 51.8.4

- `getWalletVersion`: Add support for LND 0.13.0

## 51.8.3

- `pay`: Fix error when paying a zero amount invoice but specifying mtokens
- `subscribeToInvoices`: Fix restart timeout to add longer default timeout

## 51.8.2

- `requestChainFeeIncrease`: Add method to increase the relative fee of an unconfirmed UTXO

## 51.7.0

- `sendToChainOutputScripts`: Add method to send to arbitrary output scripts

## 51.6.0

- `getLockedUtxos`: Add method to list leased UTXOs
- `lockUtxo`: Add `expires_at` attribute to specify lock expiration date

## 51.5.0

- `subscribeToForwards`: Fix documentation of `forward` event fee attributes
- `subscribeToWalletStatus`: Add method to subscribe to the status of the node

## 51.4.0

- `disableChannel`: Add method to mark a channel as disabled for outgoing payments
- `enableChannel`: Add method to mark a channel as enabled for outgoing payments

## 51.3.1

- `getPathfindingSettings`: Retrieve configuration settings of pathfinding system
- `updatePathfindingSettings`: Update configuration settings of pathfinding system

## 51.2.0

- `deleteFailedPayAttempts`: Delete records of attempts to make payments that failed
- `deleteFailedPayments`: Delete records of payments that failed to pay

## 51.1.1

- `pay`: Add `max_path_mtokens` to control path splitting when not specifying routes
- `payViaPaymentDetails`:  Add `max_path_mtokens` to control path splitting
- `payViaPaymentRequest`:  Add `max_path_mtokens` to control path splitting
- `subscribeToPayViaDetails`:  Add `max_path_mtokens` to control path splitting
- `subscribeToPayViaRequest`:  Add `max_path_mtokens` to control path splitting

## 51.0.0

### Breaking Changes

- Remove `calculateHops`, `calculatePaths` methods, abstracted out to `ln-pathfinding`

## 50.11.13

- `authenticatedLndGrpc`: Remove requirement for passing a macaroon

## 50.11.5

- `grpcProxyServer`: Fix issue with subscriptions not being closed when ws is closed
- `payViaPaymentDetails`: Add support for payment identifier nonce
- `subscribeToPayViaDetails`: Add support for payment identifier nonce

## 50.10.1

- `decodePaymentRequest`: Add `created_at` date, `is_expired` attributes
- `getInvoices`: Add `cltv_delta`, `confirmed_index`, `index`, and HTLC `timeout`

## 50.10.0

- `getPendingChannels`: Add `is_anchor` to indicate if a channel is an anchor channel

## 50.9.5

- `subscribeToOpenRequests`: Add `is_private` attribute to open channel requests

## 50.9.4

- `subscribeToChainAddress`: Correct byte ordering in tx hash when specifying tx id

## 50.9.3

- `subscribeToGraph`: Use native graph updates when feature flags are available

## 50.9.2

- `getChannels`: Add support for `is_anchor` and `is_variable_remote_key` chan types
- `subscribeToChannels`: Add support for `is_anchor`, `is_variable_remote_key` chan types

## 50.9.1

- `addInvoice`: Return `payment` record identifier in response
- `getConnectedWatchtowers`: Add `is_anchor` to get anchor tower info
- `getInvoice`: Return `payment` record identifier in response
- `getInvoices`: Return `payment` record identifier in response
- `subscribeToInvoice`: Return `payment` record identifier in response
- `subscribeToInvoices`: Return `payment` record identifier in response

## 50.8.0

- `fundPsbt`: Fix issue specifying a transaction fee
- `getPublicKey`: Support omitting `index` to generate a fresh public key
- `prepareForChannelProposal`: Add method to prepare for a channel proposal
- `proposeChannel`: Add method to propose a channel to a prepared peer

## 50.7.0

- `createInvoice`: Add support for specifying `mtokens` instead of `tokens`
- `getChannels`: Show `cooperative_close_delay_height` to indicate coop close deny height
- `subscribeToChannels`: Show `cooperative_close_delay_height` for coop close deny height

## 50.6.0

- `getForwardingReputations`: Fix broken attributes from unsupported LND versions
- `getForwardingReputations`: Add `failed_tokens`, `last_failed_forward_at`
- `getForwardingReputations`: Add `forwarded_tokens`, `last_forward_at`

## 50.5.0

- `subscribeToOpenRequests`: Add `cooperative_close_address`,`remote_csv` to `accept()`
- `subscribeToOpenRequests`: Add `min_confirmations`, `remote_reserve` to `accept()`
- `subscribeToOpenRequests`: Add `remote_max_htlcs`, `remote_max_pending_mtokens`
- `subscribeToOpenRequests`: Add `remote_min_htlc_mtokens` to accept()
- `subscribeToOpenRequests`: Add `reason` to reject()

## 50.4.2

- `createInvoice`: Decrease default expiration time
- `getSweepTransactions`: Fix method returning error when sweep tx were missing from db
- `subscribeToForwardRequests`: Add suppoort for surfacing the raw `onion` package

## 50.3.0

- `getChannels`: Add support for `in_channel`, `in_payment`, `is_forward`, `out_channel`,
    `out_payment`, and `payment` fields to surface forwarding details

## 50.2.1

Update `grpc` dependency to native JS version.

- `pay`: Fix unhandled error in failure condition

## 50.2.0

- `pay`: Fix method to use non-deprecated APIs
- `pay`: Add `incoming_peer` argument to specify last forwarding node
- `pay`: Add `max_fee_mtokens` argument to specify maximum fees in mtokens
- `pay`: Add `max_paths` argument to enable multi-path payments
- `pay`: Add `messages`argument to pass messages to the destination
- `pay`: Add `mtokens` argument to specify the amount to pay in mtokens
- `pay`: Add `outgoing_channels` to specify multiple outgoing channels to pay out of

## 50.1.1

- `subscribeToBlocks`: Fix block `hash` endian output

## 50.1.0

- `getHeight`: method added to get the current block height

## 50.0.1

Due to security issues, versions of LND lower than v0.11.0 should not be used and are no longer
supported.

- `getChannels`: `is_static_remote_key` is now always defined
- `getChannels`: `local_csv`, `local_dust`, `local_max_htlcs` are now always defined
- `getChannels`: `local_max_pending_mtokens`, `local_min_htlc_mtokens` are now defined
- `getChannels`: `remote_csv`, `remote_dust`, `remote_max_htlcs` are now always defined
- `getChannels`: `remote_max_pending_mtokens`, `remote_min_htlc_mtokens` are now defined
- `getChannels`: `time_offline` and `time_online` is now always defined
- `getFeeRates`: `id` is now always defined
- `getForwards`: `mtokens` is now always defined
- `getIdentity`: Convenience method added to get the backing node's identity public key
- `lockUtxo`: Specifying a custom id for a UTXO lock is now supported
- `subscribeToChannels`: `is_static_remote_key` is now always defined

### Breaking Changes

- Versions of LND v0.7.1 through v0.10.4 are no longer supported
- `getRoutes`: method is removed, use `getRouteToDestination` instead
- `pay`: `wss` is no longer supported
- `probe`: method is removed, use `probeForRoute` instead
- `subscribeToProbe`: method is removed, use `subscribeToProbeForRoute` instead

## 49.14.2

- `subscribeToBackups`: Improve error handling and subscription removal
- `subscribeToTransactions`: Improve error handling and subscription removal

## 49.14.1

- `fundPsbt`: Setup a PSBT with internal funding or an internal change output
- `signPsbt`: Finalize and sign a PSBT where internal keys are specified

## 49.13.0

- `sendToChainAddress`: Add `utxo_confirmations` to set confs required for UTXO selection
- `sendToChainAddresses`: Add `utxo_confirmations` to set confs required for UTXO selection

## 49.12.2

- `probeForRoute`: Fix specifying `total_mtokens` when probing for a route

## 49.12.1

- `probeForRoute`: Add support for specifying only `mtokens` in a probe for a route

## 49.12.0

- `getChannelBalance`: Add support for `channel_balance_mtokens` to show local mtokens
- `getChannelBalance`: Add support for `inbound`, `inbound_mtokens` to show remote balance
- `getChannelBalance`: Add support for `pending_inbound` to show pending remote balance
- `getChannelBalance`: Add support for `unsettled_balance` to show HTLCs balance
- `getChannelBalance`: Add support for `unsettled_balance_mtokens` to show HTLCs balance

## 49.11.1

- `addPeer`: Allow specifying a `timeout` in milliseconds to abort a connect attempt
- `openChannels`: Fix giving tokens to peers

## 49.10.0

- `getPeers`: Return `last_reconnected` to indicate last reconnection date
- `getPeers`: Return `reconnection_rate` to indicate frequency of reconnections

## 49.9.4

- `createUnsignedRequest`: Add support for empty descriptions
- `parsePaymentRequest`: Improve consistency with `decodePaymentRequest`

## 49.9.1

- `getMethods`: Add method to list available methods and related permissions

## 49.8.3

- `getAccessIds`: Add method to list macaroon root ids granted access
- `grantAccess`: Add support for `id` to specify a root id number for a macaroon
- `revokeAccess`: Add method to revoke access to macaroons with a root id number

## 49.7.0

- `subscribeToChannels`: Make `channel_closed` consistent w/`getClosedChannels`
- `subscribeToChannels`: Make `channel_opened` values consistent w/`getChannels`

## 49.6.0

- `subscribeToGraph`: Correct consistency issues in event values
- `subscribeToGraph`: Add support for `features` in node announcements

## 49.5.1

- `createHodlInvoice`: Add support for `description_hash`
- `createInvoice`: Add support for `description_hash`

## 49.4.3

- `payViaPaymentRequest`: Fix validation of `outgoing_channel`

## 49.4.1

- `getRouteThroughHops`: Add support for specifying MPP records and TLV messages
- `routeFromChannels`: Add support for specifying TLV messages

## 49.3.7

- `updateRoutingFees`: Allow specifying zero `base_fee_tokens`, `fee_rate`

## 49.3.1

- `getFeeRates`: Add support for `base_fee_mtokens` to show precise base fees

## 49.3.0

- `getClosedChannels`: Add `close_balance_spent_by` to show close sweep tx
- `getClosedChannels`: Add `close_balance_vout` to show close sweep txout
- `getClosedChannels`: Add `close_payments` to show on-chain HTLCs

## 49.2.4

- `updateRoutingFees`: Allow specifying `base_fee_mtokens` forwarding fee

## 49.2.3

- `subscribeToForwards`: Attempt to restart subscription if it is terminated

## 49.2.0

- `getChannels`: Add support for csv, dust value, max htlcs, max pending
    amount, min htlc size

## 49.1.2

- `subscribeToForwardRequests`: Add method to control forwarding of HTLCs

## 49.0.2

- `subscribeToChainAddress`: Propagate remove listeners to original subscription

## 49.0.1

- `probeForRoute`: return `confidence` score of returned route
- `probeForRoute`: allow specifying `features` of destination node
- `probeForRoute`: allow specifying `incoming_peer` for the final hop forward
- `probeForRoute`: allow specifying `messages` for messages to destination
- `probeForRoute`: allow specifying `payment` to set the payment identifier
- `probeForRoute`: allow specifying `total_mtokens` for updated payment protocol

### Breaking Changes

Method `probeForRoute` pathfinding drops support for options:

- Specifying `is_ignoring_past_failures` is no longer supported in LND 0.10.0+
- Specifying `is_strict_hints` is not supported in LND 0.10 or above

Use `--ignore` and `--incoming_peer` instead of these options where possible.

## 48.4.4

- `lockUtxo`: Add method to obtain a temporary lock on a UTXO
- `unlockUtxo`: Add method to release the temporary lock on a UTXO

## 48.3.3

- `getWalletVersion`: Add 0.10.1-beta recognition

## 48.3.1

- `updateChainTransaction`: Add support for updating chain transaction label

## 48.2.0

- `broadcastChainTransaction`: Add support for transaction `description`
- `getChainTransactions`: Add support for transaction `description`
- `sendToChainAddress`: Add support for adding a `description`
- `sendToChainAddresses`: Add support for adding a `description`

## 48.1.0

- `getChainTransactions`: Add `after` and `before` to specify height ranges
- `getSweepTransactions`: Add support for fetching 2nd level sweep transactions
- `getWalletVersion`: Add `version` to return known release version strings
- `payViaPaymentDetails`: Add support for specifying `max_paths`
- `payViaPaymentDetails`: Add support for specifying `outgoing_channels`
- `payViaPaymentRequest`: Add support for specifying `max_paths`
- `payViaPaymentRequest`: Add support for specifying `outgoing_channels`
- `subscribeToPayViaDetails`: Add support for specifying `max_paths`
- `subscribeToPayViaDetails`: Add support for specifying `outgoing_channels`
- `subscribeToPayViaRequest`: Add support for specifying `max_paths`
- `subscribeToPayViaRequest`: Add support for specifying `outgoing_channels`
- `subscribeToTransactions`: Change `confirmation_count` zero to undefined
- `subscribeToTransactions`: Return `confirmation_height` attribute when defined
- `subscribeToTransactions`: Return `created_at` attribute
- `subscribeToTransactions`: Change `fee` zero fee to undefined
- `subscribeToTransactions`: Add `output_addresses` attribute
- `subscribeToTransactions`: Add `tokens` attribute
- `subscribeToTransactions`: Add `transaction` attribute when defined
- `subscribeToTransactions`: Suppress errors when there are no error listeners

## 48.0.5

- `getPayments`: Add support for add index

## 48.0.4

- `authenticatedLndGrpc`: Fix support for hex encoded macaroons

## 48.0.3

- `addPeer`: Add `retry_delay` to specify delay to retry connection
- `authenticatedLndGrpc`: Add `router_legacy` for LND 0.9.2 and below
- `authenticatedLndGrpc`: Add `version` for version server methods
- `cancelPendingChannel`: Add method to cancel a pending opening channel
- `fundPendingChannel`: Add method to pay to a pending open channel address
- `getNetworkCentrality`: Add method to calculate node betweenness centrality
- `getPayments`: Add `limit` and `token` methods for paging payments
- `getWalletVersion`: Add method to determine the version of the LND wallet
- `grantAccess`: Add `permissions` to directly specify and view permissions
- `openChannels`: Add method to open channels with external funding
- `payViaPaymentDetails`: Add `paths` to return all payment paths
- `payViaPaymentRequest`: Add `paths` to return all payment paths
- `subscribeToPayViaDetails`: Add `paths` to return all payment paths
- `subscribeToPayViaRequest`: Add `paths` to return all payment paths

## Breaking Changes

Support for the REST server is eliminated. Use `grpcProxyServer` instead

- `getPendingChainBalance`: limbo balance from pending channels is removed
- `payViaPaymentDetails`: Attribute `hops` now returns only the first path hops
- `payViaPaymentRequest`: Attribute `hops` now returns only the first path hops
- `subscribeToPayViaDetails`: Attribute `hops` now returns only first path hops
- `subscribeToPayViaRequest`:  Attribute `hops` now returns only first path hops

## 47.16.0

- `getPendingChannels`: show initiator with `is_partner_initiated` attribute
- `getChannels`: add `partner_public_key` argument to filter channels by pubkey
- `getChannels`:  show push amounts via `local_given` and `remote_given`
- `getFeeRates`: add `id` attribute to show the short channel id of channels
- `getForwardingConfidence`: remove `past_failure_at`, `past_failure_tokens`
- `getForwardingConfidence`: remove `past_success_at`
- `getPayment`: add `fee` and `forward` to hops to show rounded up amounts
- `getPayment`: add `is_insufficient_balance` to payment status
- `payViaPaymentRequest`: add `is_insufficient_balance` to payment methods
- `subscribeToForwards`: add method to get HTLC event notification
- `subscribeToPastPayment`: add `fee`, `forward` in hops for rounded up amounts
- `subscribeToPastPayment`: add `is_insufficient_balance` to payment status
- `subscribeToPayViaDetails`: add `is_insufficient_balance` to payment status
- `subscribeToPayViaRequest`: add `is_insufficient_balance` to payment status

## 47.15.4

Improve support for node version 10

## 47.15.1

- `getClosedChannels`: indicate `is_partner_closed` and `is_partner_initiated`

## 47.14.7

- `getNode`: Return feature bits as numbers instead of strings

## 47.14.4

- Increase message maximum limit for gRPC to accomodate large responses

## 47.14.3

Fix issue with circular payments failing due to LND circular payment ban

## 47.14.2

- `getNode`: rollback lookup improvement due to sometimes policy mismatch

## 47.14.1

- `getNode`: improve with-channels lookup speed when a node has features

## 47.14.0

- `subscribeToChannels`: add `channel_opening` event for new channels

## 47.13.1

- `subscribeToProbeForRoute`: add method to probe for a route using TLV

## 47.12.0

- `decodePaymentRequest`: add `payment` attribute for payment identifier
- `getRouteToDestination`: add method to get a route to a destination with TLV

## 47.11.0

- `diffieHellmanComputeSecret`: add method to create shared key

## 47.10.4

- `getChannels`: Fix partner initiated inaccurate output
- `getInvoice`: Add `is_push` to indicate push payment
- `getInvoices`: Add `is_push` to indicate push payment
- `subscribeToInvoices`: Add `is_push` to indicate push payment

If a payment is a push payment, `request` may now be undefined on an invoice

## 47.9.0

- `getInvoice`: Add support for `features` and `messages`
- `getInvoices`: Add support for `features` and `messages`
- `payViaPaymentDetails`: Add support for specifying `features` and `messages`
- `payViaPaymentRequest`: Add support for `messages`
- `payViaRoutes`: Add support for specifying `messages`
- `subscribeToInvoice`: Add support for `features` and `messages`
- `subscribeToInvoices`: Add support for `messages`
- `subscribeToPayViaRoutes`: Add support for specifying `messages`
- `subscribeToPayViaDetails`: Add support for specifying `features`, `messages`
- `subscribeToPayViaRequest`: Add support for specifying `messages`

## 47.8.0

- `getChannels`: add `cooperative_close_address` to show coop close address
- `getWalletInfo`: add `features` for listing supported features
- `openChannel`: add `cooperative_close_address` to specify coop close address
- `subscribeToPeers`: added method to listen for peer connects and disconnects

## 47.7.0

- `createUnsignedRequest`: Add support for `features` and `payment` identifier
- `getNode`: Add support for `features` feature flag list
- `getPeers`: Add support for `features` feature flag list
- `parsePaymentRequest`: Add support for `features` and `payment` identifier

## 47.6.1

- `grantAccess`: Add `is_ok_to_sign_bytes` to allow signing arbitrary bytes
- `grantAccess`: Add `is_ok_to_verify_bytes_signatures` to verify the signatures

## 47.6.0

- `closeChannel`: Add `address` to specify address to attempt to send funds to
- `createUnsignedRequest`: Add `preimage` attribute for hash to sign preimage
- `decodePaymentRequest`: Fix zero value invoice parsing, add invoice features
- `signBytes`: Add arbitrary bytes signer method
- `updateRoutingFees`: Add argument `min_htlc_mtokens`  to update minimum HTLC
- `verifyBytesSignature`: Add signature validation method

## 47.5.6

- `subscribeToChannels`: Fix incorrect error emission

## 47.5.5

Introducing `safe_fee` and `safe_tokens` for payments. This represents token
values as rounded up versions of themselves to avoid unsafely ignoring the
amount spent as millitokens.

- `decodePaymentRequest`: add `mtokens`
- `decodePaymentRequest`: add `safe_tokens`
- `getPayment`: add `safe_fee` and `safe_tokens`
- `getRoutes`: add `safe_fee` and `safe_tokens`
- `pay`: add `safe_fee` and `safe_tokens`
- `payViaPaymentDetails`: add `safe_fee` and `safe_tokens`
- `payViaPaymentRequest`: add `safe_fee` and `safe_tokens`
- `payViaRoutes`: add `safe_fee` and `safe_tokens`
- `probeForRoute`: add `safe_fee` and `safe_tokens`
- `subscribeToPastPayment`: add `safe_fee` and `safe_tokens`
- `subscribeToPayViaDetails`: add `safe_fee` and `safe_tokens`
- `subscribeToPayViaRequest`: add `safe_fee` and `safe_tokens`
- `subscribeToPayViaRoutes`: add `safe_fee` and `safe_tokens`
- `subscribeToProbe`: add `safe_fee` and `safe_tokens`

## 47.5.4

- `getRoutes`: allow overflowing the payment size
- `openChannel`: add `partner_socket` to attempt connecting before opening

## 47.5.3

- `payViaPaymentDetails`: add `fee` attribute for fee tokens paid
- `payViaPaymentRequest`: add `fee` attribute for fee tokens paid
- `subscribeToPayViaDetails`: add `fee` attribute for fee tokens paid
- `subscribeToPayViaRequest`: add `fee` attribute for fee tokens paid

## 47.5.0

- `getPayments`: Add `attempts` attribute for HTLC details related to a payment

## 47.4.0

- `isDestinationPayable`: Add `incoming_peer` to specify last hop peer
- `payViaPaymentDetails`: Add `incoming_peer` to specify last hop peer
- `payViaPaymentRequest`: Add `incoming_peer` to specify last hop peer
- `subscribeToPayViaDetails`: Add `incoming_peer` to specify last hop peer
- `subscribeToPayViaRequest`: Add `incoming_peer` to specify last hop peer
- `restrictMacaroon`: Add method to add ip/timeout restrictions to a macaroon

## 47.3.0

- `createHodlInvoice`: Add support for `mtokens`
- `subscribeToInvoice`: Add support `mtokens`

## 47.2.1

- `parsePaymentRequest`: support uppercase payment requests

## 47.2.0

- `getPayment`: add `tokens` to indicate amount paid
- `payViaPaymentDetails`: add `max_fee_mtokens`, `mtokens` to specify mtokens
- `payViaPaymentRequest`: add `max_fee_mtokens`, `mtokens` to specify mtokens
- `probeForRoute`: add `max_fee_mtokens`, `mtokens` to specify mtokens
- `subscribeToPastPayment`:  add `tokens` to indicate amount paid
- `subscribeToPayViaDetails`:  add `max_fee_mtokens`, `mtokens` for  mtokens
- `subscribeToPayViaRequest`:  add `max_fee_mtokens`, `mtokens` for  mtokens
- `subscribeToPayViaRequest`:  add `max_fee_mtokens`, `mtokens` for  mtokens
- `subscribeToProbe`:  add `max_fee_mtokens`, `mtokens` to specify mtokens

## 47.1.1

- `getForwards`: Fix issue where new forward mtokens field was not included

## 47.1.0

- Add support for future TLV payment id and amount fields in routes
- Improve robustness of invoices subscription.

- `getRoutes`: Add args `payment` and `total_mtokens`
- `payViaRoutes`: Add args `payment` and `total_mtokens`
- `subscribeToInvoices`: Add `added_after` arg to specify minimum invoice index
- `subscribeToInvoices`: Add `confirmed_after` arg to specify min confirm index
- `subscribeToInvoices`: add support for add and confirm indexes
- `subscribeToInvoices`: now restarts automatically on failure
- `subscribeToInvoices`: new arg `restart_delay_ms` to specify restart delay
- `subscribeToPayViaRoutes`: Add args `payment` and `total_mtokens`
- `subscribeToProbe`:  Add args `payment` and `total_mtokens`
- `routeFromChannels`:  Add args `payment` and `total_mtokens`

## 47.0.0

- `getForwardingConfidence`: Add method to get forwarding confidence of
    forwarding between two peers

### Breaking Changes

- `getPaymentOdds`: Rename to `getRouteConfidence`
- `getForwardingReputations`: Rename "odds" to "confidence"
    `probability` attribute changes to `confidence`
    `general_success_odds`attribute to `confidence`
    `success_odds` attribute changes to `confidence`

## 46.6.0

- `getChannels`: add `time_offline` and `time_online` to show channel liveness
- `grantAccess`: add method to create authorization macaroons

## 46.5.2

- `getRoutes`: correct issues in route finding with CLTV values

## 46.5.1

- `getForwards`: add `mtokens` to show forwarded millitokens for a forward.

## 46.5.0

- `getRoutes`:  add `max_timeout_height` to limit the maximum CLTV height when
    pathfinding.

## 46.4.0

- `getRoutes`: add `confidence` score to indicate quality of route result
- `subscribeToProbe`: add `confidence` to `probing` event

## 46.3.3

- `subscribeToTransactions`: Added attribute `confirmation_height` to
    `chain_transaction` event
- `updateRoutingFees`: add support for adjusting `max_htlc_mtokens`

## 46.2.0

- `getRouteThroughHops`: Added method to convert a set of public keys to a full route

## 46.1.0

- `getChannels`: `is_static_remote_key` added to indicate static remote keys
- `subscribeToOpenRequests`: Added method to listen and accept/reject open channel requests

## 46.0.1

### Breaking Changes

- Support for `lnd-v0.7.0` is removed.

## 45.1.0

- `subscribeToPayViaRoutes`: Added `index` to `routing_failure` indicating which hop failed

## 45.0.0

- `getInvoice`: Added `payments` to show HTLC payments to the invoice
- `getInvoices`: Added `payments`
- `subscribeToInvoice`: Added `payments`
- `subscribeToInvoices`: Added `payments`

### Breaking Changes

- `getInvoices`: Remove attribute `routes`. To get private routes decode the payment request

## 44.0.3

- `getRoutes` Improve route construction correctness
- `routeFromChannels`, `routeFromHops`, standardize `cltv` argument as `cltv_delta`

### Breaking Changes

- `routeFromChannels` argument `cltv` is renamed `cltv_delta`
- `routeFromHops` method removed, use `routeFromChannels` instead
- `subscribeToChainAddress` argument `min_height` is now required
- `subscribeToChainSpend` argument `min_height` is now required

## 43.2.0

- `getNode` added `is_omitting_channels`. This is recommended if not getting channels.

## 43.1.0

- `subscribeToTransactions` include the derived output addresses in chain_transaction event

## 43.0.0

- `getForwardingReputations` add support for general peer reputations

### Breaking Changes

- `getForwardingReputations` returns either channel or peer odds depending on lnd version

## 42.0.2

- Fix `closeChannel` to allow specifying a channel id when closing a channel
- Add `connectWatchtower` to connect to a watchtower
- Add `disconnectWatchtower` to disconnect a watchtower
- Add `getConnectedWatchtowers` to get watchtowers and watchtower info
- Add `isDestinationPayable` to check if a destination is payable
- Add `probeForRoute` option `is_ignoring_past_failures` to ignore mission control in probe
- Add `updateConnectedWatchtower`  to update a connected watchtower

### Breaking Changes

- `getRoutes`: `timeout` argument for the final cltv delta is renamed `cltv_delta`
- `getRoutes`: `fee` argument for the max fee is renamed `max_fee`
- `pay` max timeout rename: `timeout_height` to `max_timeout_height`
- `payViaPaymentDetails`: max cltv rename: `timeout_height` to `max_timeout_height`
- `payViaPaymentRequest`: max cltv rename: `timeout_height` to `max_timeout_height`
- `probeForRoute`: Ignoring below probability option `ignore_probability_below` eliminated
- `subscribeToPayViaDetails`: max cltv rename: `timeout_height` to `max_timeout_height`
- `subscribeToProbe`: max cltv rename: `timeout_height` to `max_timeout_height`
- `subscribeToProbe`: remove `ignore_probability_below`

## 41.3.0

- Add hop hints strictness option to getRoutes to only find routes that go through specified routes
- Add hop hints strictness to subscribeToProbe, probeForRoute

## 41.2.0

- Add outgoing channel support to getRoutes
- Pad the final CLTV of getRoutes output
- Add is_synced_to_graph to getWalletInfo

## 41.1.4

- Add watchtower server status method
- Improve compatibility with lnd 0.7.1

## 41.0.1

- Abstract out accounting methods to [ln-accounting](https://github.com/alexbosworth/ln-accounting)
- Standardize the output of `verify_message` to match expectations

## 40.4.4

- Add support for route hints in payment details
- Add support for failure reasons in router rpc payments
- Add support for reserve tokens in get channels

## 40.3.0

- Allow using mission control probabilities in probing

## 40.2.0

- Add support for getting chain receives in accounting report

## 40.1.3

- Add support for deleting all payments

## 40.0.1

- Avoid returning null transaction ids in graph updates

## 39.2.2

- Add uris to getWalletInfo method

## 39.1.1

- Add getPaymentOdds method to calculate the odds of a successful payment

Fixes:

- Add missing subscribeToPayViaRequest

## 39.0.0

All previously cbk type functions can now also be used as Promises

- Add deleteForwardingReputations to clear mission control reputations
- Add getForwardingReputations to get mission control reputations
- Add getPayment method to lookup a payment
- Add payViaPaymentDetails method to make a payment using deconstructed details
- Add payViaPaymentRequest method to make a payment using BOLT 11 pay request
- Add subscribeToPastPayment to subscribe to a payment's status
- Add subscribeToPayViaDetails to make a payment using details and sub to it
- Add subscribeToPayViaRequest to make a payment using a request and sub to it

### Breaking Changes

- All promisified methods are removed
- Response type strings are being phased out
- Open channel static fee amount is no longer subtracted
- Open channel requires an explicit local amount
- `subscribeToBackup` emits named events
- `subscribeToBlocks` emits named events
- `subscribeToChannels` emits named events
- `subscribeToGraph` emits named events
- `subscribeToInvoice` emits named events
- `subscribeToInvoices` emits named events

## 38.3.9

- Add helper method for probing to find a route
- Emit a payment in flight event for pay via routes subscription

## 38.2.0

- Add support for returning original payment request in getPayments

## 38.1.0

- Add support for paying via routes in the routerrpc API.
- Add support for node color in getWalletInfo
- Add support for watching arbitrary output scripts when subscribing to address
- Add support for returning chain ids in getWalletInfo

## 38.0.0

### Breaking Changes

`lightningDaemon` is renamed to `authenticatedLndGrpc` and
`unauthenticatedLndGrpc` and there is no more need to pass a service argument.

These two methods also now return their result wrapped in `lnd` in an object.
Pass the object wrapped in `lnd` to methods and they will now select the
appropriate service automatically.

`pay` arguments have been renamed:

- `max_fee` replaces `fee`
- `outgoing_channel` replaces `out`
- `timeout_height` replaces `timeout`

`pay` also has a new argument for use when specifying a path:
`pathfinding_timeout`. This is the cutoff time for starting a new pay attempt.

There have been multiple error codes changed
