const {wrongLnd} = require('./constants');

/** Set autopilot status

  {
    is_enabled: <Enable Autopilot Bool>
    lnd: <Autopilot Service LND GRPC Object>
  }
*/
module.exports = (args, cbk) => {
  if (args.is_enabled !== false && args.is_enabled !== true) {
    return cbk([400, 'ExpectedEnabledSettingToAdjustAutopilot']);
  }

  if (!args.lnd) {
    return cbk([400, 'ExpectedAutopilotEnabledLndToSetAutopilot']);
  }

  args.lnd.modifyStatus({enable: args.is_enabled}, err => {
    if (!!err && err.message === wrongLnd) {
      return cbk([400, 'ExpectedAutopilotEnabledLndToSetAutopilotStatus']);
    }

    if (!!err) {
      return cbk([503, 'UnexpectedErrorSettingAutopilotStatus', err]);
    }

    return cbk();
  });
};
