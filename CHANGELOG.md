# Versions

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

- `getChannels`: `is_static_remote_key` added  to indicate static remote keys
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
