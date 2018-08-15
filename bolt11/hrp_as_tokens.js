const BN = require('bn.js');

const divisors = require('./conf/divisors');
const bnDivDecimals = require('./bn_div_decimals');

const decBase = 10;
const divisibilityMarkerLen = 1;
const maxMilliTokens = '2100000000000000';
const tokenDivisibility = new BN(1e8, 10);
const maxMillitokensDec = 3;

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
  let mtok;
  let decimals = '000';
  const val = new BN(value, decBase);

  if (!!divisor) {
    const BNDivisor = new BN(divisors[divisor], decBase);
    const divmod = val.mul(tokenDivisibility).divmod(BNDivisor);
    tok = divmod.div;
    if (divmod.mod.toString() != '0') {
      decimals = bnDivDecimals(divmod.mod, BNDivisor, maxMillitokensDec);
    }
  } else {
    tok = val.mul(tokenDivisibility);
  }

  if (tok.gt(new BN(maxMilliTokens, decBase))) {
    throw new Error('TokenCountExceedsMaximumValue');
  }

  mtok = `${tok.toString()}${decimals}`;
  const BNmtok = new BN(mtok, decBase);

  return { tokens: tok.toNumber(), mtokens: BNmtok.toNumber() };
};
