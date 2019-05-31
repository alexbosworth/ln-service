const {chains} = require('./ids');

/** Chain id for chain

  {
    chain: <Chain Name String>
    network: <Network Type String>
  }

  @returns
  {
    [chain]: <Chain Id Hex String>
  }
*/
module.exports = ({chain, network}) => {
  if (!chain || !network) {
    return {};
  }

  const id = chains[`${chain}${network}`];

  if (!id) {
    return {};
  }

  return {chain: Buffer.from(id, 'hex').reverse().toString('hex')};
};
