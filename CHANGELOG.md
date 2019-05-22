# Versions

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
