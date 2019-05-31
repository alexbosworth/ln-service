const defaultErrorMessage = 'ServerError';
const {isArray} = Array;

/** Return JSON or error for Express result.

  {
    log: <Log Function>
    res: {
      json: <Send JSON Function>
      send: <Send Response Function>
      status: <Set Status Function>
    }
  }

  @returns
  (err, json) => {}
*/
module.exports = ({log, res}) => {
  return (err, json) => {
    if (isArray(err) || (!!err && err.message.split(','))) {
      const [code, msg] = isArray(err) ? err : err.message.split(',');

      log(err);

      return res.status(code).send(msg || defaultErrorMessage);
    }

    if (!json) {
      return res.send();
    }

    return res.json(json);
  };
};

