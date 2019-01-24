const {readFileSync} = require('fs');

const {test} = require('tap');

const createChainAddress = require('./../../createChainAddress');
const {delay} = require('./../macros');
const {generateBlocks} = require('./../macros');
const getAutopilot = require('./../../getAutopilot');
const setAutopilot = require('./../../setAutopilot');
const {spawnLnd} = require('./../macros');

// Adjusting autopilot should result in changed autopilot status
test(`Autopilot`, async ({end, equal}) => {
  const spawned = await spawnLnd({});

  const {kill} = spawned;

  const lnd = spawned.autopilotLnd;

  equal((await getAutopilot({lnd})).is_enabled, false, 'Autopilot starts off');

  await Promise.all([
    generateBlocks({
      cert: readFileSync(spawned.chain_rpc_cert),
      count: 6,
      host: spawned.listen_ip,
      pass: spawned.chain_rpc_pass,
      port: spawned.chain_rpc_port,
      user: spawned.chain_rpc_user,
    }),
    delay(3000),
    setAutopilot({lnd, is_enabled: true}),
  ]);

  equal((await getAutopilot({lnd})).is_enabled, true, 'Autopilot turned on');

  await setAutopilot({lnd, is_enabled: false});

  equal((await getAutopilot({lnd})).is_enabled, false, 'Autopilot turned off');

  await delay(3000);

  kill();

  return end();
});
