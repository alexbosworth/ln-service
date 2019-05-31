const disabledBit = 1;
const {isArray} = Array;
const msPerSec = 1e3;

/** Policy from channel update

  {
    [key]: <Public Key Buffer Object>
    [keys]: [<Public Key Hex String>]
    update: {
      base_fee: <Base Fee Millitokens Number>
      channel_flags: <Channel Flags Number>
      fee_rate: <Fee Rate Number>
      htlc_maximum_msat: <Maximum HTLC Millitokens Number>
      htlc_minimum_msat: <Minimum HTLC Millitokens Number>
      time_lock_delta: <CLTV Delta Number>
      timestamp: <Update Epoch Time Seconds Number>
    }
  }

  @throws
  <Error>

  @returns
  {
    base_fee_mtokens: <Base Fee Millitokens String>
    cltv_delta: <Locktime Delta Number>
    fee_rate: <Fees Charged Per Million Tokens Number>
    [is_disabled]: <Channel Is Disabled Bool>
    max_htlc_mtokens: <Maximum HTLC Millitokens Value String>
    min_htlc_mtokens: <Minimum HTLC Millitokens Value String>
  }
*/
module.exports = ({key, keys, update}) => {
  if (!!key && !Buffer.isBuffer(key)) {
    throw new Error('ExpectedKeyBufferWhenDerivingPolicy');
  }

  if (!update) {
    throw new Error('ExpectedChannelUpdateToDerivePolicy');
  }

  if (!update.base_fee || !update.base_fee.toString) {
    throw new Error('ExpectedBaseFeeInChannelUpdate');
  }

  if (update.channel_flags === undefined) {
    throw new Error('ExpectedChannelFlagsInChannelUpdate');
  }

  if (update.fee_rate === undefined) {
    throw new Error('ExpectedFeeRateWhenDerivingPolicyFromChannelUpdate');
  }

  if (!update.htlc_minimum_msat) {
    throw new Error('ExpectedMinHtlcMillitokensInChannelUpdate');
  }

  if (update.time_lock_delta === undefined) {
    throw new Error('ExpectedCltvDeltaToConvertChannelUpdateToPolicy');
  }

  if (update.timestamp === undefined) {
    throw new Error('ExpectedTimestampForChannelUpdatePolicy');
  }

  let isDisabled = null;

  if (!!key && isArray(keys) && keys.length === 2) {
    const flag = !!(update.channel_flags & disabledBit);

    const [first] = keys.sort();

    isDisabled = first === key.toString('hex') ? flag : !flag;
  }

  return {
    base_fee_mtokens: update.base_fee.toString(),
    cltv_delta: update.time_lock_delta,
    fee_rate: update.fee_rate,
    is_disabled: isDisabled === null ? undefined : isDisabled,
    max_htlc_mtokens: update.htlc_maximum_msat,
    min_htlc_mtokens: update.htlc_minimum_msat,
    updated_at: new Date(update.timestamp * msPerSec).toISOString(),
  };
};
