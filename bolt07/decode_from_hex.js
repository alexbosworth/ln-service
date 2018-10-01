const decodeFromBuffer = require('./decode_from_buffer');

/** Decode a short channel id into components

  {
    id: <BOLT 7 Encoded Short Channel Id Hex String>
  }

  @throws
  <ExpectedChannelIdHex Error>
  <UnexpectedErrorDecodingChannelIdHex Error>

  @returns
  {
    block_height: <Channel Funding Transaction Inclusion Block Height Number>
    block_index: <Channel Funding Transaction Inclusion Block Position Number>
    output_index: <Channel Funding Transaction Output Index Number>
  }
*/
module.exports = ({id}) => {
  if (!id) {
    throw new Error('ExpectedChannelIdHex');
  }

  try {
    const channel = decodeFromBuffer({id: Buffer.from(id, 'hex')});

    return {
      block_height: channel.block_height,
      block_index: channel.block_index,
      output_index: channel.output_index,
    };
  } catch (err) {
    throw new Error('UnexpectedErrorDecodingChannelIdHex');
  }
};

