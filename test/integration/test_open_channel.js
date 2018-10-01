const {readFileSync} = require('fs');

const {test} = require('tap');

const addPeer = require('./../../addPeer');
const {chainSendTransaction} = require('./../macros');
const {connectChainNode} = require('./../macros');
const createChainAddress = require('./../../createChainAddress');
const {delay} = require('./../macros');
const {generateBlocks} = require('./../macros');
const getPeers = require('./../../getPeers');
const getWalletInfo = require('./../../getWalletInfo');
const {mineTransaction} = require('./../macros');
const openChannel = require('./../../openChannel');
const {spawnLnd} = require('./../macros');

const channelCapacityTokens = 1e6;
const defaultFee = 1e3;
const defaultVout = 0;
const format = 'np2wpkh';
const giftTokens = 1000;
const maturityBlockCount = 100;
const pass = 'pass';
const tokens = 1e8;
const txIdHexLength = 32 * 2;
const user = 'user';

// Opening a channel should open a channel
test(`Open channel`, async ({end, equal}) => {
  const lnds = [await spawnLnd({}), await spawnLnd({})];

  const [control, target] = lnds;

  const cert = readFileSync(control.chain_rpc_cert);
  const targetNode = await getWalletInfo({lnd: target.lnd});

  await connectChainNode({
    cert,
    pass,
    user,
    host: control.listen_ip,
    port: control.chain_rpc_port,
    connect: `${target.listen_ip}:${target.chain_listen_port}`,
  });

  const {blocks} = await generateBlocks({
    cert,
    pass,
    user,
    count: maturityBlockCount,
    host: control.listen_ip,
    port: control.chain_rpc_port,
  });

  const controlWallet = await getWalletInfo({lnd: control.lnd});
  const targetWallet = await getWalletInfo({lnd: target.lnd});

  const {address} = await createChainAddress({format, lnd: control.lnd});

  await delay(1000);

  await addPeer({
    lnd: control.lnd,
    public_key: targetNode.public_key,
    socket: `${target.listen_ip}:${target.listen_port}`,
  });

  const {peers} = await getPeers({lnd: control.lnd});

  const [targetPeer] = peers;

  await delay(1000);

  // Generate some funds for LND
  {
    const [block] = blocks;

    const [coinbaseTransaction] = block.transaction_ids;

    const {transaction} = chainSendTransaction({
      tokens,
      destination: address,
      fee: defaultFee,
      private_key: control.mining_key,
      spend_transaction_id: coinbaseTransaction,
      spend_vout: defaultVout,
    });

    await mineTransaction({
      cert,
      pass,
      transaction,
      user,
      host: control.listen_ip,
      port: control.chain_rpc_port,
    });
  }

  const channelOpen = await openChannel({
    chain_fee_tokens_per_vbyte: defaultFee,
    give_tokens: giftTokens,
    lnd: control.lnd,
    local_tokens: channelCapacityTokens,
    partner_public_key: targetNode.public_key,
  });

  equal(channelOpen.transaction_id.length, txIdHexLength, 'Channel tx id');
  equal(channelOpen.transaction_vout, defaultVout, 'Channel tx output index');
  equal(channelOpen.type, 'open_channel_pending');

  lnds.forEach(({kill}) => kill());

  return end();
});

