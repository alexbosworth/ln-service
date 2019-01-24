const {promisify} = require('util');

const {getAutopilot} = require('./');

/** Get autopilot status

  {
    lnd: <Autopilot Service LND GRPC Object>
  }

  @returns via Promise
  {
    is_enabled: <Autopilot is Enabled Bool>
  }
*/
module.exports = promisify(getAutopilot);
