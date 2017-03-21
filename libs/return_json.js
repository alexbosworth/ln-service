/** Return JSON or error

  @returns
  (err, json) => {}
*/
module.exports = (args) => {
  return (err, json) => {
    if (!!err) { return args.res.status(err[0]).send({error: err[1]}); }

    if (!json) { return args.res.send(); }

    return args.res.json(json);
  };
};

