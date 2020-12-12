const EventEmitter = require('events');

const channelRequestEvent = 'channel_request';
const compressedPublicKeyLength = 33;
const millitokensToTokens = mtokens => Number(BigInt(mtokens) / BigInt(1e3));
const privateChannel = 1;
const unimplementedMessage = 'unknown service lnrpc.Lightning';
const weightPerKWeight = 1e3;
const weightPerVByte = 4;

/** Subscribe to inbound channel open requests

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
    is_private: <Incoming Channel Is Private Bool>
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

  @event 'error'
  <Error Object>
*/
module.exports = ({lnd}) => {
  if (!lnd || !lnd.default || !lnd.default.channelAcceptor) {
    throw new Error('ExpectedLndToSubscribeToChannelRequests');
  }

  const emitter = new EventEmitter();
  const sub = lnd.default.channelAcceptor({});

  const emitError = err => {
    // Exit early when no one is listening to the error
    if (!emitter.listenerCount('error')) {
      return;
    }

    if (err.details === unimplementedMessage) {
      return emitter.emit('error', new Error('ChannelAcceptanceNotSupported'));
    }

    return emitter.emit('error', err);
  };

  sub.on('data', data => {
    if (!data) {
      return emitError(new Error('ExpectedRequestDataForChannelRequest'));
    }

    if (!Buffer.isBuffer(data.chain_hash)) {
      return emitError(new Error('ExpectedChainHashForChannelOpenRequest'));
    }

    if (!data.channel_reserve) {
      return emitError(new Error('ExpectedChannelReserveForChannelRequest'));
    }

    if (data.csv_delay === undefined) {
      return emitError(new Error('ExpectedCsvDelayInChannelOpenRequest'));
    }

    if (!data.dust_limit) {
      return emitError(new Error('ExpectedDustLimitInChannelOpenRequest'));
    }

    if (!data.fee_per_kw) {
      return emitError(new Error('ExpectedFeePerKwForChannelOpenRequest'));
    }

    if (!data.funding_amt) {
      return emitError(new Error('ExpectedFundingAmountForChannelRequest'));
    }

    if (data.max_accepted_htlcs === undefined) {
      return emitError(new Error('ExpectedMaxAcceptedHtlcsForChannelRequest'));
    }

    if (!data.max_value_in_flight) {
      return emitError(new Error('ExpectedMaxValueInFlightForChannelRequest'));
    }

    if (!data.min_htlc) {
      return emitError(new Error('ExpectedMinimumHtlcSizeForChannelRequest'));
    }

    if (!Buffer.isBuffer(data.node_pubkey)) {
      return emitError(new Error('ExpectedNodePublicKeyInRequestData'));
    }

    if (data.node_pubkey.length !== compressedPublicKeyLength) {
      return emitError(new Error('UnexpectedPublicKeyLengthInChanRequest'));
    }

    if (!Buffer.isBuffer(data.pending_chan_id)) {
      return emitError(new Error('ExpectedPendingChannelIdInRequestData'));
    }

    if (!data.push_amt) {
      return emitError(new Error('ExpectedChannelPushAmountInRequestData'));
    }

    const feeTok = Number(data.fee_per_kw) * weightPerVByte / weightPerKWeight;
    const id = data.pending_chan_id;

    return emitter.emit(channelRequestEvent, ({
      accept: (params) => {
        if (!params) {
          return sub.write({accept: true, pending_chan_id: id});
        }

        return sub.write({
          accept: true,
          csv_delay: params.remote_csv || undefined,
          in_flight_max_msat: params.remote_max_pending_mtokens || undefined,
          max_htlc_count: params.remote_max_htlcs || undefined,
          min_accept_depth: params.min_confirmations || undefined,
          min_htlc_in: params.remote_min_htlc_mtokens || undefined,
          pending_chan_id: id,
          reserve_sat: params.remote_reserve || undefined,
          upfront_shutdown: params.cooperative_close_address || undefined,
        });
      },
      capacity: Number(data.funding_amt),
      chain: data.chain_hash.reverse().toString('hex'),
      commit_fee_tokens_per_vbyte: feeTok,
      csv_delay: data.csv_delay,
      id: id.toString('hex'),
      is_private: !(data.channel_flags & privateChannel),
      local_balance: millitokensToTokens(data.push_amt),
      local_reserve: Number(data.channel_reserve),
      max_pending_mtokens: data.max_value_in_flight,
      max_pending_payments: data.max_accepted_htlcs,
      min_chain_output: Number(data.dust_limit),
      min_htlc_mtokens: data.min_htlc,
      partner_public_key: data.node_pubkey.toString('hex'),
      reject: (params) => {
        if (!params) {
          return sub.write({accept: false, pending_chan_id: id});
        }

        return sub.write({
          accept: false,
          error: params.reason || undefined,
          pending_chan_id: id,
        });
      },
    }));
  });

  sub.on('end', () => emitter.emit('end', {}));
  sub.on('error', emitError);

  emitter.on('removeListener', event => {
    // Exit early when there are still listeners to channel requests
    if (!!emitter.listenerCount(channelRequestEvent)) {
      return;
    }

    return sub.cancel();
  });

  return emitter;
};
