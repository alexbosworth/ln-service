const {deepEqual} = require('node:assert').strict;
const {equal} = require('node:assert').strict;
const {rejects} = require('node:assert').strict;
const test = require('node:test');

const {decryptPaymentOnion} = require('bolt04');
const {spawnLightningCluster} = require('ln-docker-daemons');

const {createInvoice} = require('./../../');
const {diffieHellmanComputeSecret} = require('./../../');
const {getHeight} = require('./../../');
const {getInvoice} = require('./../../');
const {getRouteToDestination} = require('./../../');
const {payViaPaymentRequest} = require('./../../');
const {payViaRoutes} = require('./../../');
const {subscribeToForwardRequests} = require('./../../');
const waitForRoute = require('./../macros/wait_for_route');

const capacity = 1e6;
const onionKey = onion => onion.slice(2, 68);
const size = 4;
const tokens = 100;

// Rejecting forward requests with a chosen failure should fail payments
test(`Reject forward requests with a chosen failure`, async () => {
  const {kill, nodes} = await spawnLightningCluster({capacity, size});

  const [{lnd}, target, middle, remote] = nodes;

  await waitForRoute({lnd, tokens, destination: remote.id});

  const errors = [];
  const invoice = await createInvoice({tokens, lnd: remote.lnd});
  const sub = subscribeToForwardRequests({lnd: target.lnd});

  // Forwards are rejected with the failure of the current case
  let rejectWith;

  // LND allows one interceptor, a failure to intercept is an error
  sub.on('error', err => errors.push(err));

  sub.on('forward_request', async forward => {
    try {
      return await rejectWith(forward);
    } catch (err) {
      errors.push(err);

      // Release the forward so the payment does not stay stuck
      return await forward.reject();
    }
  });

  // Hops derive their shared secrets in turn, decrypting their onion layers
  const authenticateAs = async ({forward, hops}) => {
    const secrets = [];

    let {onion} = forward;

    for (const hop of hops) {
      const {secret} = await diffieHellmanComputeSecret({
        lnd: hop.lnd,
        partner_public_key: onionKey(onion),
      });

      secrets.push(secret);

      onion = decryptPaymentOnion({
        onion,
        payment_hash: forward.hash,
        shared_secret: secret,
      }).onion;
    }

    return secrets;
  };

  const {route} = await getRouteToDestination({
    lnd,
    destination: remote.id,
    payment: invoice.payment,
    tokens: invoice.tokens,
    total_mtokens: invoice.mtokens,
  });

  // A failure index counts the sender, so the hops are indexed from one
  const finalHopIndex = route.hops.length;
  const interceptIndex = finalHopIndex - 2;
  const middleHopIndex = finalHopIndex - 1;
  const pay = () => payViaRoutes({lnd, id: invoice.id, routes: [route]});

  // The final hop fails as an unknown payment authenticated through the middle
  {
    const finalHeight = await getHeight({lnd: target.lnd});

    rejectWith = async forward => await forward.reject({
      failure_authentication: await authenticateAs({
        forward,
        hops: [middle, remote],
      }),
    });

    await rejects(pay(), ([code, message, {failures}]) => {
      const [[,, details]] = failures;

      equal(code, 404, 'Failure is an unknown payment');
      equal(message, 'UnknownPaymentHash', 'Failure is unknown hash');
      equal(details.index, finalHopIndex, 'Failure is from final hop');
      equal(
        details.height,
        finalHeight.current_block_height,
        'Failure has the intercepting node height'
      );

      return true;
    },
    'Payment fails as an unknown payment at the final hop');

    // Pathfinding treats the failure as the destination rejecting payment
    await rejects(
      payViaPaymentRequest({lnd, request: invoice.request}),
      [503, 'PaymentRejectedByDestination'],
      'Sender sees the payment rejected by the destination'
    );
  }

  // Node failures are attributed to the authenticated hop
  const nodeFailures = [
    {
      hops: [middle, remote],
      index: finalHopIndex,
      message: 'PermanentNodeFailure',
      reason: 'permanent_node_failure',
    },
    {
      hops: [middle],
      index: middleHopIndex,
      message: 'TemporaryNodeFailure',
      reason: 'temporary_node_failure',
    },
  ];

  for (const failure of nodeFailures) {
    rejectWith = async forward => await forward.reject({
      failure_authentication: await authenticateAs({
        forward,
        hops: failure.hops,
      }),
      failure_reason: failure.reason,
    });

    await rejects(pay(), ([code, message, {failures}]) => {
      const [[,, details]] = failures;

      equal(code, 503, `${failure.reason} is a 503 failure`);
      equal(message, failure.message, `Got ${failure.message} failure`);
      equal(details.index, failure.index, 'Failure is from expected hop');

      return true;
    },
    `Payment fails with ${failure.reason} at the expected hop`);
  }

  // The intercepting node fails with its own failure code
  {
    rejectWith = async forward => await forward.reject({
      failure_reason: 'invalid_onion_hmac',
    });

    await rejects(pay(), ([code, message, {failures}]) => {
      const [[,, details]] = failures;

      equal(code, 503, 'Failure code is a 503 failure');
      equal(message, 'InvalidOnionHmac', 'Got the chosen failure code');
      equal(details.index, interceptIndex, 'Failure is from intercepting node');

      return true;
    },
    'Payment fails with the intercepting node failure code');
  }

  sub.removeAllListeners();

  deepEqual(errors, [], 'Forwards are rejected with chosen failures');

  const inv = await getInvoice({id: invoice.id, lnd: remote.lnd});

  equal(inv.is_confirmed, false, 'Final hop did not get the payment');

  await kill({});
});
