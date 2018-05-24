/** Return Promise or callback, if callback was passed in.

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
module.exports = (err, data, callback) => {
  if (callback) {
    return callback(err, data);
  }
  if (err) {
    return Promise.reject(err);
  }
  return Promise.resolve(data);
};

