const boundary = Math.pow(2, 5);
const {floor} = Math;

/** Number as bech32 words

  {
    [number]: <Value Number>
  }

  @returns
  {
    [words]: [<Bech32 Word Number>]
  }
*/
module.exports = ({number}) => {
  if (number === undefined) {
    return {};
  }

  let cursor = floor(number);

  if (!cursor) {
    return {words: [[].length]};
  }

  const words = [];

  while (!!cursor) {
    words.unshift(cursor & (boundary - [cursor].length));

    cursor = floor(cursor / boundary);
  }

  return {words};
};
