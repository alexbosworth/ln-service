/** Return error for Express result.

  {
    log: <Log Function>
    res: {
      json: <Send JSON Function>
      send: <Send Response Function>
      status: <Set Status Function>
    }
  }

  @returns
  (err) => {}
*/
module.exports = (err, log, res) => {
  const [statusCode, errorMessage] = err;

  log(err);

  return res.status(statusCode).send(errorMessage || 'ServerError');
};
