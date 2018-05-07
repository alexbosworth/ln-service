const {getCurrentRate} = require('./../service');
const {returnJson} = require('./../async-util');
const Router = require('./router');

/** Get an exchange router

  {
    log: <Log Function>
  }

  @returns
  <Router Object>
*/
module.exports = ({log}) => {
  const router = Router({});

  router.get('/:currency_code/current_rate', ({params}, res) => {
    return getCurrentRate({
      currency_code: params.currency_code,
    },
    returnJson({log, res}));
  });

  return router;
};

