const {test} = require('tap');

const {addPeer} = require('./../../');
const {createCluster} = require('./../macros');
const {createInvoice} = require('./../../');
const {parsePaymentRequest} = require('./../../');
const {delay} = require('./../macros');
const {getAccountingReport} = require('./../../');
const {getChannel} = require('./../../');
const {getChannels} = require('./../../');
const {getUtxos} = require('./../../');
const {getWalletInfo} = require('./../../');
const {hopsFromChannels} = require('./../../routing');
const {openChannel} = require('./../../');
const {pay} = require('./../../');
const {routeFromHops} = require('./../../');
const {waitForChannel} = require('./../macros');
const {waitForPendingChannel} = require('./../macros');

const channelCapacityTokens = 1e6;
const confirmationCount = 20;
const currency = 'BTC';
const defaultFee = 1e3;
const defaultVout = 0;
const description = 'payment description';
const fiat = 'USD';
const rate = ({}, cbk) => cbk(null, {cents: 1});
const tokens = 1000;
const txIdHexLength = 32 * 2;

// Getting accounting report should return a full accounting of funds
test(`Get accounting report`, async ({deepEqual, end, equal}) => {
  const cluster = await createCluster({});

  const {lnd} = cluster.control;

  const chan = await openChannel({
    chain_fee_tokens_per_vbyte: defaultFee,
    lnd: cluster.control.lnd,
    local_tokens: channelCapacityTokens,
    partner_public_key: cluster.target_node_public_key,
    socket: `${cluster.target.listen_ip}:${cluster.target.listen_port}`,
  });

  await waitForPendingChannel({
    id: chan.transaction_id,
    lnd: cluster.control.lnd,
  });

  const report = await getAccountingReport({currency, fiat, lnd, rate});

  const [openChanFees] = report.chain_fees;

  equal(openChanFees.amount, -175750, 'Expected chain fee expense');
  equal(openChanFees.asset, currency, 'Expected chain fee currency');
  equal(openChanFees.category, 'chain_fees', 'Expected category is chain fee');
  equal(!!openChanFees.created_at, true, 'Expected created at chain fee');
  equal(openChanFees.external_id, '', 'Expected no external id for chain fee');
  equal(openChanFees.fiat_amount, -0.000017575, 'Expected fiat chain fee');
  equal(openChanFees.from_id, '', 'Expected no from id for chain fee');
  equal(openChanFees.id, `${chan.transaction_id}:fee`, 'Chain fee tx id');
  equal(openChanFees.notes, 'On-chain fee', 'Expected chain fee description');
  equal(openChanFees.to_id, '', 'Expected no destination for chain fee');
  equal(openChanFees.type, 'fee:network', 'Expected chain fee type');

  const fields = [
    'Amount',
    'Asset',
    'Date & Time',
    'Fiat Amount',
    'From ID',
    'Network ID',
    'Notes',
    'To ID',
    'Transaction ID',
    'Type',
  ].map(n => `"${n}"`);

  const expectedChainFeeRow = [
    `${openChanFees.amount}`,
    `"${openChanFees.asset}"`,
    `"${openChanFees.created_at}"`,
    `${openChanFees.fiat_amount}`,
    '""',
    '""',
    `"${openChanFees.notes}"`,
    '""',
    `"${chan.transaction_id}:fee"`,
    `"${openChanFees.type}"`,
  ];

  const chainFeeCsv = report.chain_fees_csv.split('\n').map(n => n.split(','));

  const [chainFeeHeaders, chainFeeRow] = chainFeeCsv;

  deepEqual(chainFeeHeaders, fields, 'Chain fee rows start with fields list');
  deepEqual(chainFeeRow, expectedChainFeeRow, 'Got expected chain fee row');

  await cluster.generate({count: confirmationCount, node: cluster.target});
  await cluster.generate({count: confirmationCount, node: cluster.control});

  await waitForChannel({id: chan.transaction_id, lnd: cluster.control.lnd});

  const targetToRemoteChannel = await openChannel({
    chain_fee_tokens_per_vbyte: defaultFee,
    lnd: cluster.target.lnd,
    local_tokens: channelCapacityTokens,
    partner_public_key: cluster.remote_node_public_key,
    socket: `${cluster.remote.listen_ip}:${cluster.remote.listen_port}`,
  });

  await waitForPendingChannel({
    lnd: cluster.target.lnd,
    id: targetToRemoteChannel.transaction_id,
  });

  await cluster.generate({count: confirmationCount, node: cluster.target});

  await waitForChannel({
    lnd: cluster.target.lnd,
    id: targetToRemoteChannel.transaction_id,
  });

  await addPeer({
    lnd,
    public_key: cluster.remote_node_public_key,
    socket: `${cluster.remote.listen_ip}:${cluster.remote.listen_port}`,
  });

  const {request} = await createInvoice({tokens, lnd: cluster.remote.lnd});

  const decoded = await parsePaymentRequest({request});

  const [localChan] = (await getChannels({lnd})).channels;
  const [remoteChan] = (await getChannels({lnd: cluster.remote.lnd})).channels;

  const localChannel = await getChannel({lnd, id: localChan.id});

  localChannel.id = localChan.id;

  const remoteChannel = await getChannel({
    id: remoteChan.id,
    lnd: cluster.remote.lnd,
  });

  remoteChannel.id = remoteChan.id;

  const {hops} = hopsFromChannels({
    channels: [localChannel, remoteChannel],
    destination: decoded.destination,
  });

  const route = routeFromHops({
    hops,
    cltv: decoded.cltv_delta,
    height: (await getWalletInfo({lnd})).current_block_height,
    mtokens: decoded.mtokens,
  });

  await pay({lnd, path: {id: decoded.id, routes: [route]}});

  await delay(1000);

  const controlLnd = cluster.control.lnd;
  const remoteLnd = cluster.remote.lnd;

  const [controlToTarget] = (await getChannels({lnd: controlLnd})).channels;
  const [targetToRemote] = (await getChannels({lnd: remoteLnd})).channels;

  const forwardsReport = await getAccountingReport({
    currency,
    fiat,
    rate,
    lnd: cluster.target.lnd,
  });

  const [forwardRecord] = forwardsReport.forwards;

  equal(forwardRecord.amount, 1, 'Expected forward fee amount');
  equal(forwardRecord.asset, currency, 'Expected forward fee currency');
  equal(forwardRecord.category, 'forwards', 'Expected category is forward');
  equal(!!forwardRecord.created_at, true, 'Expected created at for forward');
  equal(forwardRecord.external_id, '', 'Expected no external id for forward');
  equal(forwardRecord.fiat_amount, 0.0000000001, 'Expected fiat forward fee');
  equal(forwardRecord.from_id, controlToTarget.id, 'From chan id for forward');
  equal(forwardRecord.id, '', 'Forwards do not have ids yet');
  equal(forwardRecord.notes, tokens, 'Expected forwarded tokens');
  equal(forwardRecord.to_id, targetToRemote.id, 'To chan id for forward');
  equal(forwardRecord.type, 'income', 'Expected forward fee type');

  const toPay = await createInvoice({
    description,
    tokens,
    lnd: cluster.remote.lnd,
  });

  await pay({request: toPay.request, lnd: cluster.target.lnd});

  await getAccountingReport({
    currency,
    fiat,
    lnd,
    rate,
    category: 'payments',
  });

  const paymentsReport = await getAccountingReport({
    currency,
    fiat,
    rate,
    category: 'payments',
    lnd: cluster.target.lnd,
  });

  const [sentPayment] = paymentsReport.payments

  equal(sentPayment.amount, -toPay.tokens, 'Paid amount');
  equal(sentPayment.asset, currency, 'Paid currency');
  equal(sentPayment.category, 'payments', 'Record category');
  equal(!!sentPayment.created_at, true, 'Payment created at');
  equal(sentPayment.external_id, '', 'Payment has no external id');
  equal(!!sentPayment.fiat_amount, true, 'Payment fiat amount');
  equal(sentPayment.from_id, '', 'No from id');
  equal(sentPayment.id, toPay.id, 'Sent payment id');
  equal(sentPayment.notes.indexOf(toPay.secret) !== -1, true, 'Paid preimage');
  equal(sentPayment.to_id, cluster.remote_node_public_key, 'Paid to');
  equal(sentPayment.type, 'spend', 'Record type');

  await cluster.kill({});

  return end();
});
