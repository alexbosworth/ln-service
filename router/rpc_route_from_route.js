const rpcHopFromHop = require('./rpc_hop_from_hop');

/** RPC formatted route from a route

  {
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
      timeout: <Timeout Block Height Number>
    }]
    [messages]: [{
      type: <Message Type Number String>
      value: <Message Raw Value Hex Encoded String>
    }]
    mtokens: <Total Fee-Inclusive Millitokens String>
    [payment]: <Payment Identifier Hex String>
    timeout: <Timeout Block Height Number>
    tokens: <Total Fee-Inclusive Tokens Number>
    [total_mtokens]: <Total Millitokens String>
  }

  @throws
  <Error>

  @returns
  {
    hops: [{
      amt_to_forward: <Tokens to Forward String>
      amt_to_forward_msat: <Millitokens to Forward String>
      chan_id: <Numeric Format Channel Id String>
      chan_capacity: <Channel Capacity Number>
      expiry: <Timeout Chain Height Number>
      fee: <Fee in Tokens Number>
      fee_msat: <Fee in Millitokens Number>
      [pub_key]: <Next Hop Public Key Hex String>
      tlv_payload: <Has Extra TLV Data Bool>
      [mpp_record]: {
        payment_addr: <Payment Identifier Buffer>
        total_amt_msat: <Total Payment Millitokens Amount String>
      }
    }]
    total_amt: <Total Tokens Number>
    total_amt_msat: <Route Total Millitokens String>
    total_fees: <Route Fee Tokens String>
    total_fees_msat: <Route Total Fees Millitokens String>
    total_time_lock: <Route Total Timelock Number>
  }
*/
module.exports = args => {
  const hops = args.hops.map(hop => rpcHopFromHop(hop));

  const finalHopIndex = hops.length - 1;
  const payAddress = !args.payment ? null : Buffer.from(args.payment, 'hex');

  // Set the payment identifier and total amount in the TLV payload
  if (!!args.payment || !!args.total_mtokens) {
    hops[finalHopIndex].tlv_payload = true;

    hops[finalHopIndex].mpp_record = {
      payment_addr: payAddress || undefined,
      total_amt_msat: args.total_mtokens || undefined,
    };
  }

  // Set custom TLV payload records
  if (!!args.messages && !!args.messages.length) {
    hops[finalHopIndex].tlv_payload = true;

    hops[finalHopIndex].custom_records = args.messages.reduce((tlv, n) => {
      tlv[n.type] = Buffer.from(n.value, 'hex');

      return tlv;
    },
    {});
  }

  return {
    hops,
    total_amt: args.tokens.toString(),
    total_amt_msat: args.mtokens,
    total_fees: args.fee.toString(),
    total_fees_msat: args.fee_mtokens,
    total_time_lock: args.timeout,
  };
};
