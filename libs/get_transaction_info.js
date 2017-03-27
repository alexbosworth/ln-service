const asyncAuto = require("async/auto");
const request = require("request");

/** Get transaction info for a transaction id

  FIXME: - fix this to make it monetized

  {
    id: <Transaction Id String>
  }

  @returns via cbk
  {
    confirmation_count: <Number>
    id: <Transaction Id String>
    inputs: [{
      transaction_id: <Transaction Id String>
      vout: <Vout Number>
    }]
    outputs: [{
      address: <Address String>
      value: <Value Number>
    }]
  }
*/
module.exports = (args, cbk) => {
  if (!args.id) { return cbk([400, "Expected transaction id", args]); }

  return asyncAuto({
    getHeight: (cbk) => {
      return request({
        json: true,
        url: "https://blockchain.info/latestblock"
      }, (error, response, body) => {
        if (!!error) { return cbk([500, "Service error", error]); }

        if (!response || response.statusCode !== 200) {
          return cbk([500, "Expected 200 status"]);
        }

        if (!body || !body.height) {
          return cbk([500, "Expected block height", body]);
        }

        return cbk(null, body.height);
      });
    },

    getTransaction: ["getHeight", (res, cbk) => {
      const api = `https://blockchain.info/tx/${args.id}?format=json`;

      return request({json: true, url: api}, (error, response, body) => {
        if (!!error) { return cbk([500, "Service error", error]); }

        if (!response || response.statusCode !== 200) {
          return cbk([500, "Expected 200 status"]);
        }

        return cbk(null, {
          confirmation_count: res.getHeight - body.block_height + 1,
          id: body.hash,
          inputs: body.inputs.map((input) => {
            return {
              transaction_id: input.prev_out.addr, // FAKE
              vout: input.prev_out.n,
            };
          }),
          outputs: body.out.map((output) => {
            return {
              address: output.addr,
              value: output.value,
            };
          })
        });
      });
    }],
  },
  (err, res) => {
    if (!!err) { return cbk(err); }

    return cbk(null, res.getTransaction);
  });
};

