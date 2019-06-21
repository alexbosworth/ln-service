# Versions

## 40.1.1

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
