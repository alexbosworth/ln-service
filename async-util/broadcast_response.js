const {OPEN} = require('ws');

/** Broadcast a response to web socket clients.

  {
    clients: [<Web Socket Client Object>]
    row: <Data Object>
  }
*/
module.exports = ({clients, row}) => {
  console.log('BROADCAST', row);

  const stringifiedRow = JSON.stringify(row);

  // Client is a Set not an array so .filter cannot be used
  return clients.forEach(client => {
    if (!client || client.readyState !== OPEN) {
      return;
    }

    try { client.send(stringifiedRow); } catch (err) {
      console.log('BROADCAST ERROR', err);
    }

    return;
  });
};

