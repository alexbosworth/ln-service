const {wrongLnd} = require('./constants');

/** Get autopilot status

  {
    lnd: <Autopilot Service LND GRPC Object>
  }

  @returns via cbk
  {
    is_enabled: <Autopilot is Enabled Bool>
  }
*/
module.exports = ({lnd}, cbk) => {
  if (!lnd) {
    return cbk([400, 'ExpectedAutopilotEnabledLndToGetAutopilotStatus']);
  }

  lnd.status({}, (err, res) => {
    if (!!err && err.message === wrongLnd) {
      return cbk([400, 'ExpectedAutopilotEnabledLndToGetAutopilotStatus']);
    }

    if (!!err) {
      return cbk([503, 'UnexpectedErrorGettingAutopilotStatus', err]);
    }

    if (!res) {
      return cbk([503, 'UnexpectedEmptyResultGettingAutopilotStatus']);
    }

    if (res.active !== false && res.active !== true) {
      return cbk([503, 'UnexpectedResponseForAutopilotStatusQuery']);
    }

    return cbk(null, {is_enabled: res.active});
  });
};
