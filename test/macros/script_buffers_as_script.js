const BN = require('bn.js');

const {encode} = require('varuint-bitcoin');

const decBase = 10;
const {isBuffer} = Buffer;

/** Convert an array of script buffer elements to a fully formed script

  @param
  [<Script Element Buffer>, <Script OP_CODE Decimal Number>]

  @throws
  <Error> when a script element length exceeds maximum

  @returns
  <Script Hex>
*/
module.exports = scriptElements => {
   // Convert numbers to buffers and hex data to pushdata
  const fullScript = scriptElements
    .map(element => {
      if (isBuffer(element)) {
        return Buffer.concat([encode(element.length), element]);
      } else {
        return new BN(element, decBase).toArrayLike(Buffer);
      }
    })
    .reduce((element, script) => Buffer.concat([element, script]));

  return fullScript.toString('hex');
};
