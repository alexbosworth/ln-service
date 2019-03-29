const {test} = require('tap');

const addPeer = require('./../../addPeer');
const {createCluster} = require('./../macros');
const createInvoice = require('./../../createInvoice');
const {delay} = require('./../macros');
const getAccountingReport = require('./../../getAccountingReport');
const openChannel = require('./../../openChannel');
const pay = require('./../../pay');

const channelCapacityTokens = 1e6;
const confirmationCount = 20;
const currency = 'BTC';
const defaultFee = 1e3;
const defaultVout = 0;
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

  await cluster.generate({count: confirmationCount, node: cluster.control});

  const targetToRemoteChannel = await openChannel({
    chain_fee_tokens_per_vbyte: defaultFee,
    lnd: cluster.target.lnd,
    local_tokens: channelCapacityTokens,
    partner_public_key: cluster.remote_node_public_key,
    socket: `${cluster.remote.listen_ip}:${cluster.remote.listen_port}`,
  });

  await delay(3000);

  await cluster.generate({count: confirmationCount, node: cluster.target});

  await delay(3000);

  await addPeer({
    lnd,
    public_key: cluster.remote_node_public_key,
    socket: `${cluster.remote.listen_ip}:${cluster.remote.listen_port}`,
  });

  await delay(3000);

  const {request} = await createInvoice({lnd: cluster.remote.lnd, tokens});

  await delay(5000);

  await pay({lnd, request});

  await delay(1000);

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
  equal(forwardRecord.from_id, '443x1x0', 'Expected from chan id for forward');
  equal(forwardRecord.id, '', 'Forwards do not have ids yet');
  equal(forwardRecord.notes, tokens, 'Expected forwarded tokens');
  equal(forwardRecord.to_id, '463x1x0', 'Expected chan id for forward');
  equal(forwardRecord.type, 'income', 'Expected forward fee type');

  await cluster.kill({});

  return end();
});
