const mtokensPerToken = BigInt(1e3);

/** Get a safe token number for paid tokens.

  This means it is rounded up from millitokens. It's not safe to consider
  tokens rounded down in the case that you are reducing a corresponding balance

  {
    mtokens: <Millitokens String>
  }

  {
    safe: <Tokens Rounded Down Number>
    tokens: <Tokens Rounded Up Number>
  }
*/
module.exports = ({mtokens}) => {
  // Get a normalized number of mtokens, rounded down
  const tokens = Number(BigInt(mtokens) / mtokensPerToken);

  // Convert tokens to their mtokens equivalent
  const tokensAsMtokens = BigInt(tokens) * mtokensPerToken;

  // Exit early when there is no fractional difference
  if (tokensAsMtokens === BigInt(mtokens)) {
    return {tokens, safe: tokens};
  }

  // Safe tokens are rounded up and regular tokens are rounded down
  return {tokens, safe: tokens + [tokens].length};
};
