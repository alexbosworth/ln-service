const BN = require('bn.js');

const dividedRemainder = require('./divided_remainder');
const divisors = require('./conf/divisors');

const decBase = 10;
const divisibilityMarkerLen = 1;
const maxMillitokens = '2100000000000000';
const maxTokenDivisibility = 3;
const noDecimals = '000';
const tokenDivisibility = new BN(1e8, 10);

/** Given a Bech32 "HRP" or Human Readable Part, return the number of tokens

  {
    hrp: <Bech32 HRP String>
  }

  @throws
  <Error> when HRP is invalid

  @returns
  {
    mtokens: <Complete Channel Tokens Big Number String>
    tokens: <On-Chain Tokens Number>
  }
*/
module.exports = ({hrp}) => {
  let decimals;
  let divisor;
  let tokens;
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

  const val = new BN(value, decBase);

  // HRPs can encode values smaller than tokens on the chain can represent
  if (!!divisor) {
    const div = new BN(divisors[divisor], decBase);

    const divmod = val.mul(tokenDivisibility).divmod(div);
    const max = maxTokenDivisibility;

    const isMillitokens = divmod.mod.toString() !== '0';
    const {mod} = divmod;

    decimals = !isMillitokens ? noDecimals : dividedRemainder({div, mod, max});
    tokens = divmod.div;
  } else {
    decimals = noDecimals;
    tokens = val.mul(tokenDivisibility);
  }

  if (tokens.gt(new BN(maxMillitokens, decBase))) {
    throw new Error('TokenCountExceedsMaximumValue');
  }

  return {
    mtokens: `${tokens.toString()}${decimals}`,
    tokens: tokens.toNumber(),
  };
};
