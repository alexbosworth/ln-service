const ws = require('ws');

/** Broadcast a response to web socket clients.

  {
    clients: [<Web Socket Client Object>]
    row: <Data Object>
  }
*/
module.exports = (args) => {
  const stringifiedRow = JSON.stringify(args.row);

  args.clients.forEach((client) => {
    if (!!client && client.readyState === ws.OPEN) {
      try {
        client.send(stringifiedRow);
      } catch (err) {
        console.log('BROADCAST ERROR', err);
      }
    }
  });
};

