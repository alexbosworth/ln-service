const connectWatchtower = require('./connect_watchtower');
const disconnectWatchtower = require('./disconnect_watchtower');
const getConnectedWatchtowers = require('./get_connected_watchtowers');
const updateConnectedWatchtower = require('./update_connected_watchtower');

module.exports = {
  connectWatchtower,
  disconnectWatchtower,
  getConnectedWatchtowers,
  updateConnectedWatchtower,
};
