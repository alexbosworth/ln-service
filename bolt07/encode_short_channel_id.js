const BN = require('bn.js');

const decBase = 10;
const heightByteLength = 4;
const indexByteLength = 4;
const shortChannelIdByteLength = 8;

/** Encode a short channel id from components

  {
    block_height: <Channel Funding Transaction Inclusion Block Height Number>
    block_index: <Channel Funding Transaction Inclusion Block Position Number>
    output_index: <Channel Funding Transaction Output Index Number>
  }

  @returns
  <Short Channel Id Number String>
*/
module.exports = args => {
  const id = Buffer.alloc(shortChannelIdByteLength);

  const height = Buffer.alloc(heightByteLength);

  height.writeUInt32BE(args.block_height);

  // Skip the 1st byte of the BE height number so that only 3 bytes are used
  height.copy(id, 0, 1);

  const index = Buffer.alloc(indexByteLength);

  index.writeUInt32BE(args.block_index);

  // Skip the 1st byte of the BE index number, pull from after the height bytes
  index.copy(id, 3, 1);

  // Bring in the final 2 bytes which are the output index
  id.writeUInt16BE(args.output_index, 6);

  return new BN(id).toString(decBase);
};

