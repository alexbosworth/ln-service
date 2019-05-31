const {Parser} = require('json2csv');

const {fields} = require('./harmony');

const {isArray} = Array;

/** Convert accounting records into Harmony CSV format

  {
    records: [{
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
  }

  @throws
  <Error>

  @returns
  {
    csv: <Harmony Format CSV String>
  }
*/
module.exports = ({records}) => {
  if (!isArray(records)) {
    throw new Error('ExpectedRecordsToConvertToHarmonyFormat');
  }

  const harmonyRecords = records.map(n => ({
    'Amount': n.amount,
    'Asset': n.asset,
    'Date & Time': n.created_at,
    'Fiat Amount': n.fiat_amount,
    'From ID': n.from_id,
    'Network ID': n.external_id,
    'Notes': n.notes,
    'To ID': n.to_id,
    'Transaction ID': n.id,
    'Type': n.type,
  }));

  const parser = new Parser({fields});

  return {csv: parser.parse(harmonyRecords)};
};
