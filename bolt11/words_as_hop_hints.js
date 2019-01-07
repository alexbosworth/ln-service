const {decodeChanId} = require('bolt07');
const {encodeChanId} = require('bolt07');

const wordsAsBuffer = require('./words_as_buffer');

const decodeChanIdBuffer = buf => decodeChanId({id: buf.toString('hex')});

/** Words as hop hints

  A hop hint consists of a node represented by its public key and its channel
  edge details from that node to a receiver, defined by an outside context.

  {
    words: [<Bech 32 Word Number>]
  }

  @throws
  <Error>

  @returns
  {
    hints: [{
      base_fee_mtokens: <Base Fee Millitokens String>
      channel: <Standard Format Channel Id String>
      cltv_delta: <Final CLTV Expiration Blocks Delta Number>
      fee_rate: <Fee Rate Millitokens Per Million Number>
      public_key: <Preceding Public Key Hex String>
    }]
  }
*/
module.exports = ({words}) => {
  if (!Array.isArray(words)) {
    throw new Error('ExpectedWordsToInterpretAsHopHints');
  }

  const hints = [];
  let routesBuffer = wordsAsBuffer({words, trim: true});

  while (routesBuffer.length > 0) {
    const baseFee = parseInt(routesBuffer.slice(41, 45).toString('hex'), 16);
    const cltvDelta = parseInt(routesBuffer.slice(49, 51).toString('hex'), 16);
    const feeRate = parseInt(routesBuffer.slice(45, 49).toString('hex'), 16);
    const idComponents = decodeChanIdBuffer(routesBuffer.slice(33, 41));
    const publicKey = routesBuffer.slice(0, 33).toString('hex');

    routesBuffer = routesBuffer.slice(51);

    let encodedChanId;

    try {
      encodedChanId = encodeChanId({
        block_height: idComponents.block_height,
        block_index: idComponents.block_index,
        output_index: idComponents.output_index,
      });
    } catch (err) {
      throw new Error('FailedToEncodeChanIdForHopHint');
    }

    hints.push({
      base_fee_mtokens: baseFee.toString(),
      channel: encodedChanId.channel,
      cltv_delta: cltvDelta,
      public_key: publicKey,
      fee_rate: feeRate,
    });
  }

  return {hints};
};
