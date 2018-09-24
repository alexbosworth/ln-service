const wordsAsNumber = require('./words_as_number');

const defaultSeconds = 3600;
const msPerSec = 1e3;

/** Derive an expiration time for a payment request based on its creation time

  {
    created_at: <Created At ISO 8601 Date String>
    [words]: [<Bech32 Word Describing Expiration Seconds Number>]
  }

  @returns
  <Expiration ISO 8601 Date String>
*/
module.exports = (args) => {
  const words = args.words;

  const createdAtMs = Date.parse(args.created_at);
  const secondsToAdd = !words ? defaultSeconds : wordsAsNumber({words});

  return new Date(createdAtMs + secondsToAdd * msPerSec).toISOString();
};

