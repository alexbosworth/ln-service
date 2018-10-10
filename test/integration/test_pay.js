const {test} = require('tap');

const {createCluster} = require('./../macros');
const createInvoice = require('./../../createInvoice');
const getChannels = require('./../../getChannels');
const openChannel = require('./../../openChannel');
const pay = require('./../../pay');

const channelCapacityTokens = 1e6;
const confirmationCount = 10;
const defaultFee = 1e3;
const defaultVout = 0;
const mtokPadding = '000';
const reserveRatio = 0.99;
const tokens = 100;
const txIdHexLength = 32 * 2;

// Paying an invoice should settle the invoice
test(`Pay`, async ({deepIs, end, equal}) => {
  const cluster = await createCluster({});

  const invoice = await createInvoice({tokens, lnd: cluster.target.lnd});

  const channelOpen = await openChannel({
    chain_fee_tokens_per_vbyte: defaultFee,
    lnd: cluster.control.lnd,
    local_tokens: channelCapacityTokens,
    partner_public_key: cluster.target_node_public_key,
  });

  await cluster.generate({count: confirmationCount});

  const [channel] = (await getChannels({lnd: cluster.control.lnd})).channels;

  const commitTxFee = channel.commit_transaction_fee;
  const paid = await pay({lnd: cluster.control.lnd, request: invoice.request});

  equal(paid.fee, [].length, 'Direct fee paid is zero');
  equal(paid.fee_mtokens, [].length.toString(), 'No fee mtokens on direct');
  equal(paid.id, invoice.id, 'Payment hash is equal on both sides');
  equal(paid.is_confirmed, true, 'Invoice is paid');
  equal(paid.is_outgoing, true, 'Payments are outgoing');
  equal(paid.mtokens, `${invoice.tokens}${mtokPadding}`, 'Paid mtokens');
  equal(paid.secret, invoice.secret, 'Paid for invoice secret');
  equal(paid.tokens, invoice.tokens, 'Paid correct number of tokens');
  equal(paid.type, 'channel_transaction', 'Payment is channel transaction');

  const expectedHop = {
    channel_capacity: ((channel.capacity * reserveRatio) - commitTxFee),
    channel_id: channel.id,
    fee_mtokens: [].length.toString(),
    forward_mtokens: `${invoice.tokens}${mtokPadding}`,
    timeout: 590,
  };

  deepIs(paid.hops, [expectedHop], 'Hop is direct hop');

  cluster.kill();

  return end();
});

