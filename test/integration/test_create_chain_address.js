const {address} = require('bitcoinjs-lib');
const {spawnLightningCluster} = require('ln-docker-daemons');
const {test} = require('@alexbosworth/tap');

const {createChainAddress} = require('./../../');

const formats = ['np2wpkh', 'p2wpkh'];
const p2shAddressVersion = 196;
const pkHashByteLength = 20;
const prefixForV1 = 'bcrt1p';
const regtestBech32AddressHrp = 'bcrt';

// Creating addresses should result in addresses
test(`Create address results in address creation`, async ({end, equal}) => {
  const [{kill, lnd}] = (await spawnLightningCluster({})).nodes;

  const createNewChainAddresses = formats
    .map(async format => await createChainAddress({lnd, format}));

  const [np2wpkh, p2wpkh] = await Promise.all(createNewChainAddresses);

  const nativeAddress = address.fromBech32(p2wpkh.address);
  const nestedAddress = address.fromBase58Check(np2wpkh.address);

  equal(nativeAddress.data.length, pkHashByteLength, 'Native address pkHash');
  equal(nativeAddress.prefix, regtestBech32AddressHrp, 'Native addr prefix');
  equal(nestedAddress.version, p2shAddressVersion, 'Nested address version');

  const getUnused = formats.map(async format => {
    return await createChainAddress({lnd, format, is_unused: true});
  });

  const [unusedNp2wpkh, unusedP2wpkh] = await Promise.all(getUnused);

  equal(np2wpkh.address, unusedNp2wpkh.address, 'Nested is reused');
  equal(p2wpkh.address, unusedP2wpkh.address, 'Native is reused');

  try {
    const {address} = await createChainAddress({lnd, format: 'p2tr'});

    equal(address.startsWith(prefixForV1), true, 'A taproot address is made');
  } catch (err) {
    // LND 0.14.3 and below do not support TR addresses
  }

  await kill({});

  return end();
});
