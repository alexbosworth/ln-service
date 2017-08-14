const secretKey = process.env.LNSERVICE_SECRET_KEY;

/** Authorize a user
*/
module.exports = (username, password, cbk) => {
  // FIXME: - fill this in
  return cbk(null, !!secretKey && password === secretKey);
};

