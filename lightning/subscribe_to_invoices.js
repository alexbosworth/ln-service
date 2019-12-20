const EventEmitter = require('events');

const asyncDoUntil = require('async/doUntil');

const {htlcAsPayment} = require('./../invoices');
const {invoiceFromRpcInvoice} = require('./../invoices');
const {isLnd} = require('./../grpc');

const connectionFailureMessage = 'failed to connect to all addresses';
const decBase = 10;
const msPerSec = 1e3;
const restartSubscriptionMs = 1000 * 30;

/** Subscribe to invoices

  The `payments` array of HTLCs is only populated on LND versions after 0.7.1
  `features`, `messages` arrays aren't populated on LND version 0.8.2 and below

  {
    [added_after]: <Invoice Added After Index Number>
    [confirmed_after]: <Invoice Confirmed After Index Number>
    lnd: <Authenticated LND gRPC API Object>
    [restart_delay_ms]: <Restart Subscription Delay Milliseconds Number>
  }

  @throws
  <Error>

  @returns
  <EventEmitter Object>

  @event 'invoice_updated'
  {
    [chain_address]: <Fallback Chain Address String>
    cltv_delta: <Final CLTV Delta Number>
    [confirmed_at]: <Confirmed At ISO 8601 Date String>
    [confirmed_index]: <Confirmed Index Number>
    created_at: <Created At ISO 8601 Date String>
    description: <Description String>
    description_hash: <Description Hash Hex String>
    expires_at: <Expires At ISO 8601 Date String>
    features: [{
      bit: <Feature Bit Number>
      is_known: <Is Known Feature Bool>
      is_required: <Feature Is Required Bool>
      name: <Feature Name String>
    }]
    id: <Invoice Payment Hash Hex String>
    index: <Invoice Index Number>
    is_confirmed: <Invoice is Confirmed Bool>
    is_outgoing: <Invoice is Outgoing Bool>
    payments: [{
      [confirmed_at]: <Payment Settled At ISO 8601 Date String>
      created_at: <Payment Held Since ISO 860 Date String>
      created_height: <Payment Held Since Block Height Number>
      in_channel: <Incoming Payment Through Channel Id String>
      is_canceled: <Payment is Canceled Bool>
      is_confirmed: <Payment is Confirmed Bool>
      is_held: <Payment is Held Bool>
      messages: [{
        type: <Message Type Number String>
        value: <Raw Value Hex String>
      }]
      mtokens: <Incoming Payment Millitokens String>
      [pending_index]: <Pending Payment Channel HTLC Index Number>
      tokens: <Payment TOkens Number>
      [total_mtokens]: <Total Payment Millitokens String>
    }]
    received: <Received Tokens Number>
    received_mtokens: <Received Millitokens String>
    request: <BOLT 11 Payment Request String>
    secret: <Payment Secret Hex String>
    tokens: <Invoiced Tokens Number>
  }
*/
module.exports = args => {
  if (!isLnd({lnd: args.lnd, method: 'subscribeInvoices', type: 'default'})) {
    throw new Error('ExpectedAuthenticatedLndToSubscribeInvoices');
  }

  let addIndex = args.added_after;
  let confirmedAfter = args.confirmed_after;
  const eventEmitter = new EventEmitter();

  asyncDoUntil(cbk => {
    // Safeguard the callback from being fired multiple times
    let isFinished = false;

    // Start the subscription to invoices
    const subscription = args.lnd.default.subscribeInvoices({
      add_index: !!addIndex ? addIndex.toString() : undefined,
      settle_index: !!confirmedAfter ? confirmedAfter.toString() : undefined,
    });

    // Subscription finished callback
    const finished = err => {
      if (!!eventEmitter.listenerCount('error')) {
        eventEmitter.emit('error', err);
      }

      // Exit early when this subscription is already over
      if (!!isFinished) {
        return;
      }

      isFinished = true;

      return setTimeout(() => {
        return cbk(null, {
          listener_count: eventEmitter.listenerCount('invoice_updated'),
        });
      },
      args.restart_delay_ms || restartSubscriptionMs);
    };

    // Relay invoice updates to the emitter
    subscription.on('data', invoice => {
      try {
        const updated = invoiceFromRpcInvoice(invoice);

        eventEmitter.emit('invoice_updated', updated);

        // Update cursors for possible restart of subscription
        addIndex = updated.index;
        confirmedAfter = updated.confirmed_index;

        return;
      } catch (err) {
        return finished([503, 'UnexpectedErrorParsingInvoice', {err}]);
      }
    });

    // Subscription finished will trigger a re-subscribe
    subscription.on('end', () => finished());

    // Subscription errors fail the subscription, trigger subscription restart
    subscription.on('error', err => {
      if (err.details === connectionFailureMessage) {
        return finished([503, 'FailedToConnectToLndToSubscribeToInvoices']);
      }

      return finished([503, 'UnexpectedInvoiceSubscriptionError', {err}]);
    });

    // Relay status messages
    subscription.on('status', n => eventEmitter.emit('status', n));

    return;
  },
  (res, cbk) => {
    // Terminate the subscription when there are no listeners
    return cbk(null, res.listener_count === 0);
  },
  err => {
    if (!!err) {
      eventEmitter.emit('error', err);
    }

    eventEmitter.emit('end');

    return;
  });

  return eventEmitter;
};
