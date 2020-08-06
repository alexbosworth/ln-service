const {Transaction} = require('bitcoinjs-lib');
const {test} = require('tap');

const {broadcastChainTransaction} = require('./../../');

const tests = [
  {
    args: {},
    description: 'LND is required',
    error: [400, 'ExpectedWalletRpcLndToSendRawTransaction'],
  },
  {
    args: {lnd: {wallet: {publishTransaction: ({}, cbk) => cbk()}}},
    description: 'Raw transaction is required',
    error: [400, 'ExpectedTransactionHexStringToBroadcastToPeers'],
  },
  {
    args: {
      lnd: {wallet: {publishTransaction: ({}, cbk) => cbk('err')}},
      transaction: new Transaction().toHex(),
    },
    description: 'Expected error is returned',
    error: [503, 'UnexpectedErrBroadcastingRawTx', {err: 'err'}],
  },
  {
    args: {
      lnd: {wallet: {publishTransaction: ({}, cbk) => cbk()}},
      transaction: new Transaction().toHex(),
    },
    description: 'A result is required',
    error: [503, 'ExpectedResultOfBroadcastRawTransaction'],
  },
  {
    args: {
      lnd: {
        wallet: {
          publishTransaction: ({}, cbk) => cbk(null, {publish_error: 'err'}),
        },
      },
      transaction: new Transaction().toHex(),
    },
    description: 'Failure to broadcast error is returned',
    error: [
      503,
      'FailedToBroadcastRawTransaction',
      {res: {publish_error: 'err'}},
    ],
  },
  {
    args: {
      lnd: {wallet: {publishTransaction: ({}, cbk) => cbk(null, {})}},
      transaction: new Transaction().toHex(),
    },
    description: 'A transaction is published',
    expected: {id: 'd21633ba23f70118185227be58a63527675641ad37967e2aa461559f577aec43'},
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, async ({deepEqual, end, equal, rejects}) => {
    if (!!error) {
      rejects(() => broadcastChainTransaction(args), error, 'Got expected error');
    } else {
      const {id} = await broadcastChainTransaction(args);

      equal(id, expected.id, 'Got fee rate');
    }

    return end();
  });
});
