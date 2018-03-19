const secretKey = process.env.LNSERVICE_SECRET_KEY;

/** Authorize a user
*/
module.exports = (username, password, cbk) => {
  return cbk(null, !!secretKey && password === secretKey);
};

