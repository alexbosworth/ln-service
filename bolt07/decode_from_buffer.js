const blockIndexByteLength = 4;
const decimalBase = 10;
const heightByteLength = 4;
const outputIndexByteLength = 2;

/** Decode a short channel id into components

  {
    id: <BOLT 7 Encoded Short Channel Id Buffer Object>
  }

  @throws
  <Error>

  @returns
  {
    block_height: <Channel Funding Transaction Inclusion Block Height Number>
    block_index: <Channel Funding Transaction Inclusion Block Position Number>
    output_index: <Channel Funding Transaction Output Index Number>
  }
*/
module.exports = ({id}) => {
  if (!Buffer.isBuffer(id)) {
    throw new Error('ExpectedChannelIdBuffer');
  }

  const height = Buffer.alloc(heightByteLength);
  const index = Buffer.alloc(blockIndexByteLength);
  const vout = Buffer.alloc(outputIndexByteLength);

  // Skip the first byte of height, which will be zero due to BE 3byte encoding
  id.copy(height, 1);

  // Skip the first byte of index, also zero. Write into id after the 3rd byte
  id.copy(index, 1, 3);

  // Write the vout into the final 2 bytes
  id.copy(vout, 0, 6);

  return {
    block_height: height.readUInt32BE(0),
    block_index: index.readUInt32BE(0),
    output_index: vout.readUInt16BE(0),
  };
};

