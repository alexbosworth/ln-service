const asyncAuto = require('async/auto');
const {returnResult} = require('asyncjs-util');

const {openChannel} = require('./../../');
const waitForChannel = require('./wait_for_channel');
const waitForPendingChannel = require('./wait_for_pending_channel');

const channelCapacityTokens = 1e6;
const confirmationCount = 20;
const defaultFee = 1e3;

/** Setup channel

  {
    generate: <Generate Blocks Promise>
    [generator]: <Generator Node Object>
    [give]: <Gift Tokens Number>
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
module.exports = ({generate, generator, give, lnd, to}, cbk) => {
  return new Promise((resolve, reject) => {
    return asyncAuto({
      // Open channel
      chanOpen: cbk => {
        return openChannel({
          lnd,
          chain_fee_tokens_per_vbyte: defaultFee,
          give_tokens: give,
          local_tokens: channelCapacityTokens,
          partner_public_key: to.public_key,
          socket: to.socket,
        },
        cbk);
      },

      // Wait for pending
      waitPending: ['chanOpen', ({chanOpen}, cbk) => {
        return waitForPendingChannel({lnd, id: chanOpen.transaction_id}, cbk);
      }],

      // Generate blocks
      generate: ['waitPending', async ({}) => {
        return await generate({count: confirmationCount, node: generator});
      }],

      // Wait for open
      channel: ['generate', ({chanOpen}, cbk) => {
        return waitForChannel({lnd, id: chanOpen.transaction_id}, cbk);
      }],
    },
    returnResult({reject, resolve, of: 'channel'}, cbk));
  });
};
