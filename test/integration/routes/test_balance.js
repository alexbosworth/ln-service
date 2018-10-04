const {test} = require('tap');

const {spawnLnd} = require('./../../macros');

const walletInfoType = 'wallet';
const app = require('./../../../server');
const request = require('supertest');

// Getting the address
test(`Get wallet info`, async ({end, equal, afterEach}) => {
  const {kill, lnd} = await spawnLnd({});

  let result = await request(app)
    .get('/v0/balance')
      .set('Authorization', 'Basic cnBjdXNlcjpycGNwYXNzd29yZA==')
      .expect(200).then((response) => {
        console.log('='.repeat(100))
        console.log(response)
        end();
      }).catch((error) => {
        throw new Error(error);
        end();
      });

  afterEach(() => {
    return kill();
  })
});
