const asyncAuto = require('async/auto');
const {returnResult} = require('asyncjs-util');

const {openChannel} = require('./../../');
const waitForChannel = require('./wait_for_channel');
const waitForPendingChannel = require('./wait_for_pending_channel');

const channelCapacityTokens = 1e6;
const confirmationCount = 6;
const defaultFee = 1e3;

/** Setup channel

  {
    [capacity]: <Channel Capacity Tokens Number>
    generate: <Generate Blocks Promise>
    [generator]: <Generator Node Object>
    [give]: <Gift Tokens Number>
    [hidden]: <Channel Is Private Bool>
    lnd: <Authenticated LND gRPC API Object>
    to: {
      public_key: <Partner Public Key Hex String>
      socket: <Network Address String>
    }
  }

  @returns via cbk or Promise
  {
    id: <Standard Format Channel Id String>
    transaction_id: <Funding Transaction Id Hex String>
    transaction_vout: <Funding Transaction Output Index Number>
  }
*/
module.exports = (args, cbk) => {
  return new Promise((resolve, reject) => {
    return asyncAuto({
      // Open channel
      chanOpen: cbk => {
        return openChannel({
          chain_fee_tokens_per_vbyte: defaultFee,
          give_tokens: args.give,
          is_private: !!args.hidden,
          lnd: args.lnd,
          local_tokens: args.capacity || channelCapacityTokens,
          partner_public_key: args.to.public_key,
          socket: args.to.socket,
        },
        cbk);
      },

      // Wait for pending
      waitPending: ['chanOpen', ({chanOpen}, cbk) => {
        return waitForPendingChannel({
          id: chanOpen.transaction_id,
          lnd: args.lnd,
        },
        cbk);
      }],

      // Generate blocks
      generate: ['waitPending', async ({}) => {
        return await args.generate({
          count: confirmationCount,
          node: args.generator,
        });
      }],

      // Wait for open
      channel: ['generate', ({chanOpen}, cbk) => {
        return waitForChannel({
          id: chanOpen.transaction_id,
          lnd: args.lnd,
        },
        cbk);
      }],
    },
    returnResult({reject, resolve, of: 'channel'}, cbk));
  });
};
