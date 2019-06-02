const {chanFormat} = require('bolt07');

const policyFromChannelUpdate = require('./policy_from_channel_update');

/** Payment failure

  {
    failure: {
      [chan_id]: <Numeric Channel Id String>
      [channel_update]: {
        base_fee: <Base Fee Millitokens Number>
        chain_hash: <Chain Hash Buffer Object>
        channel_flags: <Channel Flags Number>
        extra_opaque_data: <Extra Opaque Data Buffer Object>
        fee_rate: <Fee Rate Number>
        htlc_maximum_msat: <Maximum HTLC Millitokens Number>
        htlc_minimum_msat: <Minimum HTLC Millitokens Number>
        message_flags: <Message Flags Number>
        signature: <Signature Buffer Object>
        time_lock_delta: <CLTV Delta Number>
        timestamp: <Update Epoch Time Seconds Number>
      }
      code: <Failure Code String>
      failure_source_pubkey: <Public Key Buffer Object>
      htlc_msat: <HTLC Millitokens String>
    }
    [keys]: [<Public Key Hex String>]
  }

  @returns
  {
    code: <Error Code Number>
    [details]: {
      channel: <Standard Format Channel Id String>
      [mtokens]: <Millitokens String>
      [policy]: {
        base_fee_mtokens: <Base Fee Millitokens String>
        cltv_delta: <Locktime Delta Number>
        fee_rate: <Fees Charged Per Million Tokens Number>
        [is_disabled]: <Channel is Disabled Bool>
        max_htlc_mtokens: <Maximum HLTC Millitokens value String>
        min_htlc_mtokens: <Minimum HTLC Millitokens Value String>
      }
      public_key: <Public Key Hex String>
      [update]: {
        chain: <Chain Id Hex String>
        channel_flags: <Channel Flags Number>
        extra_opaque_data: <Extra Opaque Data Hex String>
        message_flags: <Message Flags Number>
        signature: <Channel Update Signature Hex String>
      }
    }
    message: <Error Message String>
  }
*/
module.exports = ({failure, keys}) => {
  if (!failure) {
    return {code: 500, message: 'ExpectedFailureToDerivePaymentFailure'};
  }

  const key = failure.failure_source_pubkey;
  const update = failure.channel_update;

  if (!!update) {
    try {
      policyFromChannelUpdate({key, keys, update});
    } catch (err) {
      return {code: 500, message: 'ExpectedValidChannelUpdateToDeriveFailure'};
    }
  }

  const {channel} = !update ? {} : chanFormat({number: update.chan_id});
  const hasMtokens = !!failure.htlc_msat && failure.htlc_msat !== '0';

  const details = {
    channel,
    mtokens: !hasMtokens ? undefined : failure.htlc_msat,
    policy: !update ? null : policyFromChannelUpdate({key, keys, update}),
    public_key: !key ? undefined : key.toString('hex'),
    update: !update ? undefined : {
      chain: update.chain_hash.reverse().toString('hex'),
      channel_flags : update.channel_flags,
      extra_opaque_data: update.extra_opaque_data.toString('hex'),
      message_flags: update.message_flags,
      signature: update.signature.toString('hex'),
    },
  };

  switch (failure.code) {
  case 'UNKNOWN_PAYMENT_HASH':
    return {details, code: 404, message: 'UnknownPaymentHash'};

  case 'INCORRECT_PAYMENT_AMOUNT':
    return {details, code: 404, message: 'IncorrectPaymentAmount'};

  case 'FINAL_INCORRECT_CLTV_EXPIRY':
    return {details, code: 404, message: 'FinalIncorrectCltvExpiry'};

  case 'FINAL_INCORRECT_HTLC_AMOUNT':
    return {details, code: 404, message: 'FinalIncorrectHtlcAmount'};

  case 'FINAL_EXPIRY_TOO_SOON':
    return {details, code: 404, message: 'FinalExpiryTooSoon'};

  case 'INVALID_REALM':
    return {details, code: 503, message: 'InvalidRealm'};

  case 'EXPIRY_TOO_SOON':
    return {details, code: 503, message: 'ExpiryTooSoon'};

  case 'INVALID_ONION_VERSION':
    return {details, code: 503, message: 'InvalidOnionVersion'};

  case 'INVALID_ONION_HMAC':
    return {details, code: 503, message: 'InvalidOnionHmac'};

  case 'INVALID_ONION_KEY':
    return {details, code: 503, message: 'InvalidOnionKey'};

  case 'AMOUNT_BELOW_MINIMUM':
    return {details, code: 503, message: 'AmountBelowMinimum'};

  case 'FEE_INSUFFICIENT':
    return {details, code: 503, message: 'FeeInsufficient'};

  case 'INCORRECT_CLTV_EXPIRY':
    return {details, code: 503, message: 'IncorrectCltvExpiry'};

  case 'CHANNEL_DISABLED':
    return {details, code: 503, message: 'ChannelDisabled'};

  case 'TEMPORARY_CHANNEL_FAILURE':
    return {details, code: 503, message: 'TemporaryChannelFailure'};

  case 'REQUIRED_NODE_FEATURE_MISSING':
    return {details, code: 503, message: 'RequiredNodeFeatureMissing'};

  case 'REQUIRED_CHANNEL_FEATURE_MISSING':
    return {details, code: 503, message: 'RequiredChannelFeatureMissing'};

  case 'UNKNOWN_NEXT_PEER':
    return {details, code: 503, message: 'UnknownNextPeer'};

  case 'TEMPORARY_NODE_FAILURE':
    return {details, code: 503, message: 'TemporaryNodeFailure'};

  case 'PERMANENT_NODE_FAILURE':
    return {details, code: 503, message: 'PermanentNodeFailure'};

  case 'PERMANENT_CHANNEL_FAILURE':
    return {details, code: 503, message: 'PermanentChannelFailure'};

  default:
    return {code: 500, message: 'UnexpectedPayViaRoutesFailure'};
  }
};
