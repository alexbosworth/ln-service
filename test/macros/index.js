const {promisify} = require('util');

const delay = promisify(setTimeout);
const setupChannel = require('./setup_channel');
const waitForChannel = promisify(require('./wait_for_channel'));
const waitForPendingChannel = promisify(require('./wait_for_pending_channel'));
const waitForRoute = promisify(require('./wait_for_route'));
const waitForTermination = promisify(require('./wait_for_termination'));
const waitForUtxo = promisify(require('./wait_for_utxo'));

module.exports = {
  delay,
  setupChannel,
  waitForChannel,
  waitForPendingChannel,
  waitForRoute,
  waitForTermination,
  waitForUtxo,
};
