const {OPEN} = require('ws');

/** Broadcast a response to web socket clients.

  {
    row: <Data Object>
    wss: [<Web Socket Server Object>]
  }
*/
module.exports = ({row, wss}) => {
  console.log('BROADCAST', row);

  const stringifiedRow = JSON.stringify(row);

  return wss.forEach(w => {
    // Client is a Set not an array so .filter cannot be used
    return w.clients.forEach(client => {
      if (!client || client.readyState !== OPEN) {
        return;
      }

      try { client.send(stringifiedRow); } catch (err) {
        console.log('BROADCAST ERROR', err);
      }

      return;
    });
  });
};

