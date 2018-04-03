const {Router} = require('express');

const {closeChannel} = require('./../lightning');
const {getChannels} = require('./../lightning');
const {openChannel} = require('./../lightning');
const {returnJson} = require('./../async-util');

/** Get a channels router

  {
    lnd: <LND API>
  }

  @returns
  <Router Object>
*/
module.exports = ({lnd}) => {
  const router = Router({caseSensitive: true, strict: true});

  // End a channel
  router.delete('/:id', ({params}, res) => {
    return closeChannel({lnd, id: params.id}, returnJson({res}));
  });

  //
  router.get('/', (_, res) => getChannels({lnd}, returnJson({res})));

  router.post('/', ({body}, res, next) => {
    return openChannel({
      lnd,
      partner_public_key: body.partner_public_key,
      local_amt: body.local_amt,
    },
    returnJson({res}));
  });

  return router;
};
