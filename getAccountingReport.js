const {promisify} = require('util');

const {getAccountingReport} = require('./');

/** Get an accounting summary of wallet

  Note: Chain fees does not include chain fees paid to close channels

  {
    [after]: <After ISO 8601 Date String>
    [before]: <Before ISO 8601 Date String>
    currency: <Base Currency Type String>
    fiat: <Fiat Currency Type String>
    [ignore]: <Ignore Function> (record) -> <Should Ignore Record Bool>
    lnd: <LND gRPC Object>
  }

  @returns via Promise
  {
    chain_fees: [{
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
    chain_fees_csv: <CSV String>
    chain_sends: [{
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
    chain_sends_csv: <CSV String>
    forwards: [{
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
    forwards_csv: <CSV String>
    invoices: [{
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
    invoices_csv: <CSV String>
    payments: [{
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
    payments_csv: <CSV String>
  }
*/
module.exports = promisify(getAccountingReport);
