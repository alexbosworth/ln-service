# Versions

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
