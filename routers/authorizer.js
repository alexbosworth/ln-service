const {LNSERVICE_SECRET_KEY} = process.env;

/** Authorize a user
*/
module.exports = ({}, password, cbk) => {
  // A secret key is required for authentication success
  if (!LNSERVICE_SECRET_KEY) {
    return cbk(null, false);
  }

  return cbk(null, password === LNSERVICE_SECRET_KEY);
};

