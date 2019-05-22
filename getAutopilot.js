const {promisify} = require('util');

const {getAutopilot} = require('./');

/** Get Autopilot status

  // Optionally, get the score of nodes as considered by the autopilot.
  // Local scores reflect an internal scoring that includes local channel info

  {
    lnd: <Authenticated LND gRPC Object>
    [node_scores]: [<Get Score For Public Key Hex String>]
  }

  @returns via Promise
  {
    is_enabled: <Autopilot is Enabled Bool>
    nodes: [{
      local_preferential_score: <Local-adjusted Pref Attachment Score Number>
      local_score: <Local-adjusted Externally Set Score Number>
      preferential_score: <Preferential Attachment Score Number>
      public_key: <Node Public Key Hex String>
      score: <Externally Set Score Number>
      weighted_local_score: <Combined Weighted Locally-Adjusted Score Number>
      weighted_score: <Combined Weighted Score Number>
    }]
  }
*/
module.exports = promisify(getAutopilot);
