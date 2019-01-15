const {Parser} = require('json2csv');

const {fields} = require('./harmony');

/** Convert accounting records into Harmony CSV format

  {
  
  }

  @throws
  <Error>

  @returns
  {
    csv: <CSV String>
  }
*/
module.exports = ({records}) => {
  if (!Array.isArray(records)) {
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
