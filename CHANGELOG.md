# Versions

## 50.4.1

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
