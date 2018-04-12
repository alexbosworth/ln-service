const BN = require('bn.js');

const divisors = require('./conf/divisors');

const decBase = 10;
const divisibilityMarkerLen = 1;
const maxMilliTokens = '2100000000000000';
const tokenDivisibility = new BN(1e8, 10);

/** Given a Bech32 "HRP" or Human Readable Part, return the number of tokens

  {
    hrp: <Bech32 HRP String>
  }

  @throws
  <Error> when HRP is invalid

  @returns
  <Tokens Number>
*/
module.exports = ({hrp}) => {
  let divisor;
  let value;

  if (hrp.slice(-divisibilityMarkerLen).match(/^[munp]$/)) {
    divisor = hrp.slice(-divisibilityMarkerLen);
    value = hrp.slice(0, -divisibilityMarkerLen);
  } else if (hrp.slice(-divisibilityMarkerLen).match(/^[^munp0-9]$/)) {
    throw new Error('InvalidAmountMultiplier');
  } else {
    value = hrp;
  }

  if (!value.match(/^\d+$/)) {
    throw new Error('InvalidAmount');
  }

  let tok;
  const val = new BN(value, decBase);

  if (!!divisor) {
    tok = val.mul(tokenDivisibility).div(new BN(divisors[divisor], decBase));
  } else {
    tok = val.mul(tokenDivisibility);
  }

  if (tok.gt(new BN(maxMilliTokens, decBase))) {
    throw new Error('TokenCountExceedsMaximumValue');
  }

  return tok.toNumber();
};

