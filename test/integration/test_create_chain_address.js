const {address} = require('bitcoinjs-lib');
const {test} = require('tap');

const createChainAddress = require('./../../createChainAddress');
const {delay} = require('./../macros');
const {spawnLnd} = require('./../macros');

const chainAddressRowType = 'chain_address';
const p2shAddressVersion = 196;
const pkHashByteLength = 20;
const regtestBech32AddressHrp = 'bcrt';

// Creating addresses should result in addresses
test(`Create address results in address creation`, async ({end, equal}) => {
  const {kill, lnd} = await spawnLnd({});

  const np2wpkh = await createChainAddress({lnd, format: 'np2wpkh'});
  const p2wpkh = await createChainAddress({lnd, format: 'p2wpkh'});

  const nativeAddress = address.fromBech32(p2wpkh.address);
  const nestedAddress = address.fromBase58Check(np2wpkh.address);

  equal(nativeAddress.data.length, pkHashByteLength, 'Native address pkHash');
  equal(nativeAddress.prefix, regtestBech32AddressHrp, 'Native addr prefix');
  equal(nestedAddress.version, p2shAddressVersion, 'Nested address version');
  equal(np2wpkh.type, chainAddressRowType, 'Nested row type');
  equal(p2wpkh.type, chainAddressRowType, 'Native row type');

  const unusedNp2wpkh = await createChainAddress({
    lnd,
    format: 'np2wpkh',
    is_unused: true,
  });

  const unusedP2wpkh = await createChainAddress({
    lnd,
    format: 'p2wpkh',
    is_unused: true,
  });

  equal(np2wpkh.address, unusedNp2wpkh.address, 'Nested is reused');
  equal(p2wpkh.address, unusedP2wpkh.address, 'Native is reused');

  kill();

  await delay(3000);

  return end();
});

