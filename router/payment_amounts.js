const {MAX_SAFE_INTEGER} = Number;
const mtokPerTok = BigInt(1e3);

/** Determine the amounts to use for payments

  Either mtokens or tokens are required

  Specifying both mtokens and tokens is not supported unless they are equal

  Specifying differing max_fee and max_fee_mtokens is not supported

  {
    [max_fee]: <Maximum Tokens Fee Number>
    [max_fee_mtokens]: <Maximum Millitokens Fee String>
    [mtokens]: <Millitokens String>
    [request]: <BOLT 11 Request String>
    [tokens]: <Tokens Number>
  }

  @throws
  <Error>

  @returns
  {
    [max_fee]: <Max Fee Tokens Number>
    [max_fee_mtokens]: <Max Fee Millitokens String>
    [mtokens]: <Millitokens String<
    [tokens]: <Tokens Number>
  }
*/
module.exports = args => {
  const amounts = {};

  const hasMaxFeeMtokens = !!args.max_fee_mtokens;
  const hasMaxFeeTokens = args.max_fee !== undefined;
  const hasMtokens = !!args.mtokens;
  const hasTokens = args.tokens !== undefined;

  if (!args.request && !hasMtokens && !hasTokens) {
    throw new Error('ExpectedAmountFromRequestOrMillitokensOrTokens');
  }

  if (hasMaxFeeTokens && hasMaxFeeMtokens) {
    const maxFeeAsMtokens = (BigInt(args.max_fee) * mtokPerTok).toString();

    // Cannot specify both max fee millitokens and also tokens if they differ
    if (maxFeeAsMtokens !== args.max_fee_mtokens) {
      throw new Error('UnexpectedDifferingMaxFeeAndMaxFeeMtokens');
    }

    // Since the millitokens and tokens are set, use the default max_fee
    amounts.max_fee = args.max_fee;
  } else if (hasMaxFeeTokens) {
    amounts.max_fee = args.max_fee;
  } else if (hasMaxFeeMtokens) {
    amounts.max_fee_mtokens = args.max_fee_mtokens;
  } else {
    amounts.max_fee = MAX_SAFE_INTEGER;
  }

  if (hasTokens && hasMtokens) {
    const tokensAsMtokens = (BigInt(args.tokens) * mtokPerTok).toString();

    // Cannot specify both millitokens and also tokens if they differ
    if (tokensAsMtokens !== args.mtokens) {
      throw new Error('UnexpectedDifferingMtokensAndTokens');
    }

    amounts.tokens = args.tokens;
  } else if (hasTokens) {
    amounts.tokens = args.tokens;
  } else if (!args.request) {
    amounts.mtokens = args.mtokens;
  }

  return {
    max_fee: amounts.max_fee,
    max_fee_mtokens: amounts.max_fee_mtokens,
    mtokens: amounts.mtokens,
    tokens: amounts.tokens,
  };
};
