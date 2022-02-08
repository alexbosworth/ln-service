const bip32 = require('bip32');
const bs58check = require('bs58check');
const ecc = require('tiny-secp256k1')
const {spawnLightningCluster} = require('ln-docker-daemons');
const {test} = require('@alexbosworth/tap');

const {createChainAddress} = require('./../../');
const {getMasterPublicKeys} = require('./../../');

const asHex = n => n.toString('hex');
const BIP32Factory = bip32.default;
const chainCodeFromMasterPublicKey = n => n.slice(13, 45);
const firstKeyPath = 'm/0/0';
const identityKeyName = 'act:6';
const p2wpkhPath = `m/84'/0'/0'`;
const publicKeyFromMasterPublicKey = n => n.slice(45, 78);

// Getting master public keys should return a list of master public keys
test(`Get master public keys`, async ({end, equal, strictSame}) => {
  const [{id, kill, lnd}] = (await spawnLightningCluster({})).nodes;

  const {fromPublicKey} = await BIP32Factory(ecc);

  // This method is not supported on LND 0.13.3 and below
  try {
    const {keys} = await getMasterPublicKeys({lnd});

    const [,, key] = keys;

    // Check if extended keys are available
    if (!key) {
      await kill({});

      return end();
    }
  } catch (err) {
    strictSame(err, [501, 'GetMasterPublicKeysMethodNotSupported'], 'Got err');

    await kill({});

    return end();
  }

  try {
    // Make a new address
    const {address} = await createChainAddress({lnd});

    // Get the list of accounts
    const {keys} = await getMasterPublicKeys({lnd});

    const masterP2wpkhKey = keys.find(n => n.derivation_path === p2wpkhPath);

    // The address creation is reflected in the accounts metadata
    equal(masterP2wpkhKey.external_key_count, [address].length, 'Key is used');

    // Find the identity key master public key
    const masterIdentityKey = keys.find(n => n.named === identityKeyName);

    // Convert the key from base58 into its raw form
    const rawKey = bs58check.decode(masterIdentityKey.extended_public_key);

    const chainCode = chainCodeFromMasterPublicKey(rawKey);
    const publicKey = publicKeyFromMasterPublicKey(rawKey);

    // Make a bip32 object to derive from
    const masterKey = fromPublicKey(publicKey, chainCode);

    // Pull out the first key from the identity master public key
    const identityKey = masterKey.derivePath(firstKeyPath);

    equal(asHex(identityKey.publicKey), id, 'Got identity master public key');
  } catch (err) {
    equal(err, null, 'Expected no error');
  }

  await kill({});

  return end();
});
