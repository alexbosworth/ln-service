const {encode} = require('varuint-bitcoin');

const {address} = require('bitcoinjs-lib');
const {crypto} = require('bitcoinjs-lib');
const {ECPair} = require('bitcoinjs-lib');
const {networks} = require('bitcoinjs-lib');
const {payments} = require('bitcoinjs-lib');
const {script} = require('bitcoinjs-lib');
const scriptBufAsScript = require('./script_buffers_as_script');
const {Transaction} = require('bitcoinjs-lib');
const {TransactionBuilder} = require('bitcoinjs-lib');

const defaultNetwork = 'testnet';
const encodeSignature = script.signature.encode;
const hexBase = 16;
const {p2pkh} = payments;
const {SIGHASH_ALL} = Transaction;

/** Create a transaction that sends coins to a destination chain address

  {
    destination: <Destination Address String>
    fee: <Fee Tokens To Remove From Spend Number>
    private_key: <WIF Serialized Private Key String>
    spend_transaction_id: <Transaction Id to Spend Hex String>
    spend_vout: <Vout to Spend Number>
    tokens: <Tokens to Spend Number>
  }

  @returns
  {
    transaction: <Transaction Hex Serialized String>
  }
*/
module.exports = (args, cbk) => {
  if (!args.destination) {
    throw new Error('ExpectedDestinationAddressToSendTokensTo');
  }

  if (!args.private_key) {
    throw new Error('ExpectedPrivateKeyToAuthorizeSend');
  }

  if (!args.spend_transaction_id) {
    throw new Error('ExpectedOutpointTxIdToSpend');
  }

  if (args.spend_vout === undefined) {
    throw new Error('ExpectedOutpointVoutToSpend');
  }

  if (!args.tokens) {
    throw new Error('ExpectedTokenCountToSend');
  }

  const network = networks[defaultNetwork];

  const keyPair = ECPair.fromWIF(args.private_key, network);
  const txBuilder = new TransactionBuilder(network);

  txBuilder.addInput(args.spend_transaction_id, args.spend_vout);

  try {
    txBuilder.addOutput(args.destination, (args.tokens - (args.fee || 0)));
  } catch (err) {
    throw new Error('ErrorAddingOutputToSendOnChainTransaction');
  }

  [keyPair].forEach((k, i) => txBuilder.sign(i, k));

  const transaction = txBuilder.build().toHex();
  const sigHashAll = parseInt(SIGHASH_ALL, hexBase);

  const tx = Transaction.fromHex(transaction);

  [keyPair].forEach((signingKey, vin) => {
    const flag = sigHashAll;
    const {publicKey} = signingKey;

    const scriptPub = p2pkh({network, pubkey: publicKey}).output;

    const sigHash = tx.hashForSignature(vin, scriptPub, flag);

    const signature = signingKey.sign(sigHash);

    const sig = encodeSignature(signature, flag);

    const sigPush = Buffer.concat([encode(sig.length), sig]);
    const pubKeyPush = Buffer.concat([encode(publicKey.length), publicKey]);

    const scriptSig = Buffer.concat([sigPush, pubKeyPush]);

    tx.setInputScript(vin, scriptSig);

    return;
  });

  return {transaction: tx.toHex()};
};

