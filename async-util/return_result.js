/** Return result of async auto flow

  {
    [of]: <Property String>
  }

  @returns
  <(err, res) Function>
*/
module.exports = (args, cbk) => {
  return (err, res) => {
    if (!!err) {
      return cbk(err);
    }

    if (!!args.of) {
      return cbk(null, res[args.of]);
    }

    return cbk();
  };
};

