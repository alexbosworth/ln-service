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
    if (Array.isArray(err)) {
      const [statusCode, errorMessage] = err;

      log(err);

      return res.status(statusCode).send(errorMessage || 'ServerError');
    }

    if (!json) {
      return res.send();
    }

    return res.json(json);
  };
};

