const asyncAuto = require('async/auto');
const asyncMapSeries = require('async/mapSeries');
const asyncUntil = require('async/until');
const {includes} = require('lodash');
const {returnResult} = require('asyncjs-util');
const {sortBy} = require('lodash');

const {getChainTransactions} = require('./../lightning');
const {getChannels} = require('./../lightning');
const {getClosedChannels} = require('./../lightning');
const {getForwards} = require('./../lightning');
const getHistoricFiatRate = require('./get_coindesk_historic_rate');
const {getInvoices} = require('./../lightning');
const {getPayments} = require('./../lightning');
const {getPendingChannels} = require('./../lightning');
const harmonize = require('./harmonize');
const {parsePaymentRequest} = require('./../bolt11');

const earlyStartDate = '2017-08-24T08:57:37.000Z';
const largeLimit = 1e8;

/** Get an accounting summary of wallet

  Note: Chain fees does not include chain fees paid to close channels

  {
    [category]: <Category Filter String>
    currency: <Base Currency Type String>
    fiat: <Fiat Currency Type String>
    [ignore]: <Ignore Function> (record) -> <Should Ignore Record Bool>
    lnd: <LND gRPC Object>
    [rate]: <Exchange Function> ({currency, date, fiat}, cbk) => (err, {cents})
  }

  @returns via cbk or Promise
  {
    [chain_fees]: [{
      [amount]: <Amount Number>
      [asset]: <Asset Type String>
      [created_at]: <ISO 8601 Date String>
      [external_id]: <External Reference Id String>
      [from_id]: <Source Id String>
      [id]: <Record Id String>
      [notes]: <Notes String>
      [to_id]: <Destination Id String>
      [type]: <Record Type String>
    }]
    [chain_fees_csv]: <CSV String>
    [chain_sends]: [{
      [amount]: <Amount Number>
      [asset]: <Asset Type String>
      [created_at]: <ISO 8601 Date String>
      [external_id]: <External Reference Id String>
      [from_id]: <Source Id String>
      [id]: <Record Id String>
      [notes]: <Notes String>
      [to_id]: <Destination Id String>
      [type]: <Record Type String>
    }]
    [chain_sends_csv]: <CSV String>
    [forwards]: [{
      [amount]: <Amount Number>
      [asset]: <Asset Type String>
      [created_at]: <ISO 8601 Date String>
      [external_id]: <External Reference Id String>
      [from_id]: <Source Id String>
      [id]: <Record Id String>
      [notes]: <Notes String>
      [to_id]: <Destination Id String>
      [type]: <Record Type String>
    }]
    [forwards_csv]: <CSV String>
    [invoices]: [{
      [amount]: <Amount Number>
      [asset]: <Asset Type String>
      [created_at]: <ISO 8601 Date String>
      [external_id]: <External Reference Id String>
      [from_id]: <Source Id String>
      [id]: <Record Id String>
      [notes]: <Notes String>
      [to_id]: <Destination Id String>
      [type]: <Record Type String>
    }]
    [invoices_csv]: <CSV String>
    [payments]: [{
      [amount]: <Amount Number>
      [asset]: <Asset Type String>
      [created_at]: <ISO 8601 Date String>
      [external_id]: <External Reference Id String>
      [from_id]: <Source Id String>
      [id]: <Record Id String>
      [notes]: <Notes String>
      [to_id]: <Destination Id String>
      [type]: <Record Type String>
    }]
    [payments_csv]: <CSV String>
  }
*/
module.exports = ({category, currency, fiat, ignore, lnd, rate}, cbk) => {
  return new Promise((resolve, reject) => {
    return asyncAuto({
      // Check arguments
      validate: cbk => {
        if (!currency) {
          return cbk([400, 'ExpectedNativeCurrencyAssetType']);
        }

        if (!fiat) {
          return cbk([400, 'ExpectedConversionCurrencyType']);
        }

        if (!lnd) {
          return cbk([400, 'ExpectedLndToGetAccountingReport']);
        }

        return cbk();
      },

      // Get transactions on the blockchain
      getChainTx: ['validate', ({}, cbk) => {
        if (!!category && !includes(['chain_fees', 'chain_sends'], category)) {
          return cbk();
        }

        return getChainTransactions({lnd}, cbk);
      }],

      // Get channels
      getChannels: ['validate', ({}, cbk) => {
        if (!!category && category !== 'chain_sends') {
          return cbk();
        }

        return getChannels({lnd}, cbk);
      }],

      // Get closed channels
      getClosedChans: ['validate', ({}, cbk) => {
        if (!!category && category !== 'chain_sends') {
          return cbk();
        }

        return getClosedChannels({lnd}, cbk)
      }],

      // Get routing forwards
      getForwards: ['validate', ({}, cbk) => {
        if (!!category && category !== 'forwards') {
          return cbk();
        }

        return getForwards({
          lnd,
          after: earlyStartDate,
          before: new Date().toISOString(),
          limit: largeLimit,
        },
        cbk);
      }],

      // Get invoices
      getInvoices: ['validate', ({}, cbk) => {
        if (!!category && category !== 'invoices') {
          return cbk();
        }

        const invoices = [];
        let next;

        // Iterate through invoice pages until all invoices are collected
        return asyncUntil(
          cbk => {
            return getInvoices({lnd, token: next}, (err, res) => {
              if (!!err) {
                return cbk(err);
              }

              next = res.next || false;

              res.invoices.forEach(invoice => invoices.push(invoice));

              return cbk(null, invoices);
            });
          },
          cbk => cbk(null, next === false),
          cbk
        );
      }],

      // Get payments
      getPayments: ['validate', ({}, cbk) => {
        if (!!category && category !== 'payments') {
          return cbk();
        }

        return getPayments({lnd}, cbk);
      }],

      // Get pending channels
      getPending: ['validate', ({}, cbk) => {
        if (!!category && category !== 'chain_sends') {
          return cbk();
        }

        return getPendingChannels({lnd}, cbk);
      }],

      // Forward records
      forwards: ['getForwards', ({getForwards}, cbk) => {
        if (!getForwards) {
          return cbk(null, []);
        }

        // Only pay attention to forwards that generated fees
        const records = getForwards.forwards.map(n => ({
          amount: n.fee,
          category: 'forwards',
          created_at: n.created_at,
          from_id: n.incoming_channel,
          notes: n.tokens,
          to_id: n.outgoing_channel,
          type: 'income',
        }));

        return cbk(null, records);
      }],

      // Invoice records
      invoices: ['getInvoices', ({getInvoices}, cbk) => {
        if (!getInvoices) {
          return cbk(null, []);
        }

        // Only look at invoices where funds were received
        const records = getInvoices
          .filter(n => !!n.is_confirmed && !!n.received)
          .map(n => ({
            amount: n.received,
            category: 'invoices',
            created_at: n.created_at,
            id: n.id,
            notes: `Invoice: ${n.description.replace(/,/gim, ' ')}`,
            type: 'income',
          }));

        return cbk(null, records);
      }],

      // Payment records
      payments: ['getPayments', ({getPayments}, cbk) => {
        if (!getPayments) {
          return cbk(null, []);
        }

        // Only look at payments where funds were sent
        const payRecords = getPayments.payments.map(n => ({
          amount: n.tokens * -1,
          category: 'payments',
          created_at: n.created_at,
          id: n.id,
          notes: !n.request ? n.secret : parsePaymentRequest({
            request: n.request,
          }).description + ` - ${n.secret}`,
          to_id: n.destination,
          type: 'spend',
        }));

        const feeRecords = getPayments.payments
          .filter(({fee}) => !!fee)
          .map(n => ({
            amount: n.fee * -1,
            category: 'payments',
            created_at: n.created_at,
            id: `${n.id}:fee`,
            notes: `Routing fee`,
            type: 'fee:network',
          }));

        return cbk(null, [].concat(payRecords).concat(feeRecords));
      }],

      // Chain fees
      chainFees: ['getChainTx', ({getChainTx}, cbk) => {
        if (!getChainTx) {
          return cbk(null, []);
        }

        const records = getChainTx.transactions
          .filter(tx => !!tx.fee && !!tx.is_outgoing)
          .map(tx => ({
            amount: tx.fee * -1,
            category: 'chain_fees',
            created_at: tx.created_at,
            id: `${tx.id}:fee`,
            notes: 'On-chain fee',
            type: 'fee:network',
          }));

        return cbk(null, records);
      }],

      // Chain send records
      chainSends: [
        'getChainTx',
        'getChannels',
        'getClosedChans',
        'getPending',
        ({getChainTx, getChannels, getClosedChans, getPending}, cbk) =>
      {
        if (!getChainTx || !getChannels || !getClosedChans || !getPending) {
          return cbk(null, []);
        }

        const records = getChainTx.transactions
          .filter(tx => !!tx.is_confirmed && !!tx.tokens && !!tx.is_outgoing)
          .filter(({id}) => {
            const channels = []
              .concat(getClosedChans.channels)
              .concat(getPending.pending_channels)
              .concat(getChannels.channels);

            if (channels.find(n => n.transaction_id === id)) {
              return false;
            }

            if (channels.find(n => n.close_transaction_id === id)) {
              return false;
            }

            return true;
          })
          .map(tx => ({
            amount: (tx.tokens - tx.fee) * (tx.is_outgoing ? -1 : 1),
            category: 'chain_sends',
            created_at: tx.created_at,
            id: tx.id,
            notes: `Outputs to ${tx.output_addresses.join(' ')}`,
            type: !!tx.is_outgoing ? 'transfer:withdraw' : 'transfer:deposit',
          }));

        return cbk(null, records);
      }],

      // Records with fiat amounts
      recordsWithFiat: [
        'chainFees',
        'chainSends',
        'forwards',
        'invoices',
        'payments',
        ({chainFees, chainSends, forwards, invoices, payments}, cbk) =>
      {
        const records = []
          .concat(chainFees || [])
          .concat(chainSends || [])
          .concat(forwards || [])
          .concat(invoices || [])
          .concat(payments || []);

        const sortedRecords = sortBy(records, 'created_at').filter(record => {
          if (!ignore) {
            return true;
          }

          return ignore(record);
        });

        return asyncMapSeries(records, (record, cbk) => {
          const date = record.created_at;
          const getRate = rate || getHistoricFiatRate;

          return getRate({currency, fiat, date}, (err, rate) => {
            if (!!err) {
              return cbk(err);
            }

            let notes;

            if (typeof record.notes === 'string') {
              notes = record.notes.replace(/[\r\n]/gim, ' ') || '';
            } else if (record.notes === undefined) {
              notes = '';
            } else {
              notes = record.notes;
            }

            return cbk(null, {
              notes,
              amount: record.amount || 0,
              asset: currency,
              category: record.category,
              created_at: record.created_at,
              external_id: record.external_id || '',
              fiat_amount: record.amount * rate.cents / 1e8 / 100,
              from_id: record.from_id || '',
              id: record.id || '',
              to_id: record.to_id || '',
              type: record.type,
            });
          });
        },
        cbk);
      }],

      // Report
      report: ['recordsWithFiat', ({recordsWithFiat}, cbk) => {
        const records = recordsWithFiat.sort((a, b) => {
          return a.created_at < b.created_at ? -1 : 1;
        });

        try {
          const chainFees = records.filter(n => n.category === 'chain_fees');
          const chainSends = records.filter(n => n.category === 'chain_sends');
          const forwards = records.filter(n => n.category === 'forwards');
          const invoices = records.filter(n => n.category === 'invoices');
          const payments = records.filter(n => n.category === 'payments');

          return cbk(null, {
            chain_fees: chainFees,
            chain_fees_csv: harmonize({records: chainFees}).csv,
            chain_sends: chainSends,
            chain_sends_csv: harmonize({records: chainSends}).csv,
            forwards: forwards,
            forwards_csv: harmonize({records: forwards}).csv,
            invoices: invoices,
            invoices_csv: harmonize({records: invoices}).csv,
            payments: payments,
            payments_csv: harmonize({records: payments}).csv,
          });
        } catch (err) {
          return cbk([500, 'FailedToConvertRecordsToHarmonyFormat', err]);
        }
      }],
    },
    returnResult({reject, resolve, of: 'report'}, cbk));
  });
};
