/** Return JSON or error.

  @returns
  (err, json) => {}
*/
module.exports = (args) => {
  return (err, json) => {
    if (Array.isArray(err)) {
      const [statusCode, errorMessage] = err;

      console.log("ERROR", err);

      return args.res.status(statusCode).send({error: errorMessage || ''});
    }

    if (!json) { return args.res.send(); }

    return args.res.json(json);
  };
};

