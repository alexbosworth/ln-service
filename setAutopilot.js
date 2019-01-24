const {promisify} = require('util');

const {setAutopilot} = require('./');

/** Set autopilot status

  {
    is_enabled: <Enable Autopilot Bool>
    lnd: <Autopilot Service LND GRPC Object>
  }
*/
module.exports = promisify(setAutopilot);
