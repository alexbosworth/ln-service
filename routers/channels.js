const {closeChannel} = require('./../lightning');
const {getChannels} = require('./../lightning');
const {openChannel} = require('./../lightning');
const {returnJson} = require('./../async-util');
const Router = require('./router');

/** Get a channels router

  {
    lnd: <LND API>
    log: <Log Function>
  }

  @returns
  <Router Object>
*/
module.exports = ({lnd, log}) => {
  const router = Router({});

  // End a channel
  router.delete('/:id', ({params}, res) => {
    return closeChannel({lnd, id: params.id}, returnJson({log, res}));
  });

  // Get all channels
  router.get('/', ({}, res) => getChannels({lnd}, returnJson({log, res})));

  // Open a channel
  router.post('/', ({body}, res, next) => {
    return openChannel({
      lnd,
      chain_fee_tokens_per_vbyte: body.chain_fee_tokens_per_vbyte,
      give_tokens: body.give_tokens,
      local_tokens: body.local_tokens,
      partner_public_key: body.partner_public_key,
    },
    returnJson({log, res}));
  });

  return router;
};

