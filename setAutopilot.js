const {promisify} = require('util');

const {setAutopilot} = require('./');

/** Configure Autopilot settings

  // Either candidate_nodes or is_enabled is required
  // Candidate node scores range from 1 to 100,000,000

  {
    [candidate_nodes]: [{
      public_key: <Node Public Key Hex String>
      score: <Score Number>
    }]
    [is_enabled]: <Enable Autopilot Bool>
    lnd: <Authenticated LND gRPC Object>
  }
*/
module.exports = promisify(setAutopilot);
