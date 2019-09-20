const {chanNumber} = require('bolt07');

const millitokensAsTokens = n => Number(BigInt(n) / BigInt(1e3));

/** Get a hop formatted as a RPC hop

  {
    channel: <Standard Format Channel Id String>
    channel_capacity: <Channel Capacity Tokens Number>
    fee: <Fee Number>
    fee_mtokens: <Fee Millitokens String>
    forward: <Forward Tokens Number>
    forward_mtokens: <Forward Millitokens String>
    [public_key]: <Forward Edge Public Key Hex String>
    timeout: <Timeout Block Height Number>
  }

  @throws
  <Error>

  @returns
  {
    amt_to_forward: <Tokens to Forward String>
    amt_to_forward_msat: <Millitokens to Forward String>
    chan_id: <Numeric Format Channel Id String>
    chan_capacity: <Channel Capacity Number>
    expiry: <Timeout Chain Height Number>
    fee: <Fee in Tokens Number>
    fee_msat: <Fee in Millitokens Number>
    [pub_key]: <Next Hop Public Key Hex String>
  }
*/
module.exports = args => {
  return {
    amt_to_forward: millitokensAsTokens(args.forward_mtokens).toString(),
    amt_to_forward_msat: args.forward_mtokens,
    chan_id: chanNumber({channel: args.channel}).number,
    chan_capacity: args.channel_capacity.toString(),
    expiry: args.timeout,
    fee: millitokensAsTokens(args.fee_mtokens).toString(),
    fee_msat: args.fee_mtokens,
    pub_key: args.public_key || undefined,
  };
};
