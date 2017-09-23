const async = require('async/retry');
const request = require('request');

const API = 'https://api.coindesk.com/v1/';
const REMOTE_SERVICE_TIMEOUT_MS = 20 * 1000;

const intBase = 10;

/** Get the number of USD cents for a Bitcoin

  {
    time: <Epoch Time Number>
  }

  @returns via cbk
  <Cents Number>
*/
module.exports = (args, cbk) => {
  return asyncRetry({
    interval: (retryCount) => { return 50 * Math.pow(2, retryCount); },
    times: 10,
  },
  (cbk) => {
    const endTime = args.time * 1000;
    const startTime = (args.time - 1 - 24 * 60 * 60) * 1000;

    const endDate = new Date(endTime).toISOString().substring(0, 10);
    const startDate = new Date(startTime).toISOString().substring(0, 10);

    return request({
      json: true,
      qs: {end: endDate, start: startDate},
      timeout: REMOTE_SERVICE_TIMEOUT_MS,
      url: `${API}bpi/historical/close.json`,
    },
    (err, r, body) => {
      if (!!err) { return cbk([500, 'Get price fail', err]); }

      if (!body.bpi || !body.bpi[startDate]) {
        return go_on([500, 'Expected price', body]);
      }

      const cents = parseInt((body.bpi[startDate] * 100, intBase).toFixed());

      return cbk(null, cents);
    });
  },
  (err, result) => {
    if (!!err) { return cbk(err); }

    return cbk(null, result);
  });
};

