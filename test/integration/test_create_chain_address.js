const {equal} = require('node:assert').strict;
const test = require('node:test');

const {decodeBase58Address} = require('@alexbosworth/blockchain');
const {decodeBech32Address} = require('@alexbosworth/blockchain');
const {spawnLightningCluster} = require('ln-docker-daemons');

const {createChainAddress} = require('./../../');

const formats = ['np2wpkh', 'p2wpkh'];
const p2shAddressVersion = 196;
const p2trProgramLength = 32;
const p2trVersion = 1;
const pkHashByteLength = 20;
const prefixForV1 = 'bcrt1p';
const regtestBech32AddressHrp = 'bcrt';

// Creating addresses should result in addresses
test(`Create address results in address creation`, async () => {
  const [{kill, lnd}] = (await spawnLightningCluster({})).nodes;

  const createNewChainAddresses = formats
    .map(async format => await createChainAddress({lnd, format}));

  const [np2wpkh, p2wpkh] = await Promise.all(createNewChainAddresses);

  const nativeAddress = decodeBech32Address({address: p2wpkh.address});
  const nestedAddress = decodeBase58Address({address: np2wpkh.address});

  equal(nativeAddress.program.length, pkHashByteLength, 'Native addr pkHash');
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

    const p2trAddress = decodeBech32Address({address});

    equal(p2trAddress.prefix, regtestBech32AddressHrp, 'addr has p2tr prefix');
    equal(p2trAddress.program.length, p2trProgramLength, 'P2TR addr length');
    equal(p2trAddress.version, p2trVersion, 'address has the P2TR version');
  } catch (err) {
    // LND 0.14.5 and below do not support TR addresses
    const [code] = err;

    equal(code, 501, 'Taproot addresses are unsupported');
  }

  await kill({});

  return;
});
