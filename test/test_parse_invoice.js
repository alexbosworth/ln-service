const {equal} = require('tap');

const {parseInvoice} = require('./../index');

const msPerSec = 1e3;

const fixtures = {
  test_cases: [
    {
      _: 'Please make a donation of any amount using payment_hash',
      expected: {
        created_at: new Date(1496314658 * msPerSec).toISOString(),
        description: 'Please consider supporting this project',
        destination: '03e7156ae33b0a208d0744199163177e909e80176e55d97a2f221ede0f934dd9ad',
        expires_at: new Date((1496314658 + 3600) * msPerSec).toISOString(),
        id: '0001020304050607080900010203040506070809000102030405060708090102',
        is_expired: true,
        network: 'bitcoin',
        tokens: null,
      },
      invoice: 'lnbc1pvjluezpp5qqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqypqdpl2pkx2ctnv5sxxmmwwd5kgetjypeh2ursdae8g6twvus8g6rfwvs8qun0dfjkxaq8rkx3yf5tcsyz3d73gafnh3cax9rn449d9p5uxz9ezhhypd0elx87sjle52x86fux2ypatgddc6k63n7erqz25le42c4u4ecky03ylcqca784w',
    },
    {
      _: 'Please send $3 for a cup of coffee to the same peer, within 1 minute',
      expected: {
        created_at: new Date(1496314658 * msPerSec).toISOString(),
        description: '1 cup coffee',
        destination: '03e7156ae33b0a208d0744199163177e909e80176e55d97a2f221ede0f934dd9ad',
        expires_at: new Date((1496314658 + 60) * msPerSec).toISOString(),
        id: '0001020304050607080900010203040506070809000102030405060708090102',
        is_expired: true,
        network: 'bitcoin',
        tokens: 250000,
      },
      invoice: 'lnbc2500u1pvjluezpp5qqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqypqdq5xysxxatsyp3k7enxv4jsxqzpuaztrnwngzn3kdzw5hydlzf03qdgm2hdq27cqv3agm2awhz5se903vruatfhq77w3ls4evs3ch9zw97j25emudupq63nyw24cg27h2rspfj9srp',
    },
    {
      _: 'Please send 0.0025 BTC for a cup of nonsense (ナンセンス 1杯) to the same peer, within 1 minute',
      expected: {
        created_at: new Date(1496314658 * msPerSec).toISOString(),
        description: 'ナンセンス 1杯',
        destination: '03e7156ae33b0a208d0744199163177e909e80176e55d97a2f221ede0f934dd9ad',
        expires_at: new Date((1496314658 + 60) * msPerSec).toISOString(),
        id: '0001020304050607080900010203040506070809000102030405060708090102',
        is_expired: true,
        network: 'bitcoin',
        tokens: 250000,
      },
      invoice: 'lnbc2500u1pvjluezpp5qqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqypqdpquwpc4curk03c9wlrswe78q4eyqc7d8d0xqzpuyk0sg5g70me25alkluzd2x62aysf2pyy8edtjeevuv4p2d5p76r4zkmneet7uvyakky2zr4cusd45tftc9c5fh0nnqpnl2jfll544esqchsrny',
    },
    {
      _: 'Now send $24 for an entire list of things (hashed)',
      expected: {
        created_at: new Date(1496314658 * msPerSec).toISOString(),
        destination: '03e7156ae33b0a208d0744199163177e909e80176e55d97a2f221ede0f934dd9ad',
        expires_at: new Date((1496314658 + 3600) * msPerSec).toISOString(),
        id: '0001020304050607080900010203040506070809000102030405060708090102',
        is_expired: true,
        network: 'bitcoin',
        tokens: 2000000,
      },
      invoice: 'lnbc20m1pvjluezpp5qqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqypqhp58yjmdan79s6qqdhdzgynm4zwqd5d7xmw5fk98klysy043l2ahrqscc6gd6ql3jrc5yzme8v4ntcewwz5cnw92tz0pc8qcuufvq7khhr8wpald05e92xw006sq94mg8v2ndf4sefvf9sygkshp5zfem29trqq2yxxz7',
    },
    {
      _: 'On mainnet, with fallback address 1RustyRX2oai4EYYDpQGWvEL62BBGqN9T with extra routing info',
      expected: {
        created_at: new Date(1496314658 * msPerSec).toISOString(),
        destination: '03e7156ae33b0a208d0744199163177e909e80176e55d97a2f221ede0f934dd9ad',
        expires_at: new Date((1496314658 + 3600) * msPerSec).toISOString(),
        id: '0001020304050607080900010203040506070809000102030405060708090102',
        is_expired: true,
        network: 'bitcoin',
        tokens: 2000000,
      },
      invoice: 'lnbc20m1pvjluezpp5qqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqypqhp58yjmdan79s6qqdhdzgynm4zwqd5d7xmw5fk98klysy043l2ahrqsfpp3qjmp7lwpagxun9pygexvgpjdc4jdj85fr9yq20q82gphp2nflc7jtzrcazrra7wwgzxqc8u7754cdlpfrmccae92qgzqvzq2ps8pqqqqqqpqqqqq9qqqvpeuqafqxu92d8lr6fvg0r5gv0heeeqgcrqlnm6jhphu9y00rrhy4grqszsvpcgpy9qqqqqqgqqqqq7qqzqj9n4evl6mr5aj9f58zp6fyjzup6ywn3x6sk8akg5v4tgn2q8g4fhx05wf6juaxu9760yp46454gpg5mtzgerlzezqcqvjnhjh8z3g2qqdhhwkj',
    },
    {
      _: 'On mainnet, with fallback (P2SH) address 3EktnHQD7RiAE6uzMj2ZifT9YgRrkSgzQX',
      expected: {
        created_at: new Date(1496314658 * msPerSec).toISOString(),
        destination: '03e7156ae33b0a208d0744199163177e909e80176e55d97a2f221ede0f934dd9ad',
        expires_at: new Date((1496314658 + 3600) * msPerSec).toISOString(),
        id: '0001020304050607080900010203040506070809000102030405060708090102',
        is_expired: true,
        network: 'bitcoin',
        tokens: 2000000,
      },
      invoice: 'lnbc20m1pvjluezhp58yjmdan79s6qqdhdzgynm4zwqd5d7xmw5fk98klysy043l2ahrqspp5qqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqypqfppj3a24vwu6r8ejrss3axul8rxldph2q7z9kmrgvr7xlaqm47apw3d48zm203kzcq357a4ls9al2ea73r8jcceyjtya6fu5wzzpe50zrge6ulk4nvjcpxlekvmxl6qcs9j3tz0469gq5g658y',
    },
    {
      _: 'On mainnet, with fallback (P2WPKH) address bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4',
      expected: {
        created_at: new Date(1496314658 * msPerSec).toISOString(),
        destination: '03e7156ae33b0a208d0744199163177e909e80176e55d97a2f221ede0f934dd9ad',
        expires_at: new Date((1496314658 + 3600) * msPerSec).toISOString(),
        id: '0001020304050607080900010203040506070809000102030405060708090102',
        is_expired: true,
        network: 'bitcoin',
        tokens: 2000000,
      },
      invoice: 'lnbc20m1pvjluezhp58yjmdan79s6qqdhdzgynm4zwqd5d7xmw5fk98klysy043l2ahrqspp5qqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqypqfppqw508d6qejxtdg4y5r3zarvary0c5xw7kepvrhrm9s57hejg0p662ur5j5cr03890fa7k2pypgttmh4897d3raaq85a293e9jpuqwl0rnfuwzam7yr8e690nd2ypcq9hlkdwdvycqa0qza8',
    },
    {
      _: 'On mainnet, with fallback (P2WSH) address bc1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3qccfmv3',
      expected: {
        created_at: new Date(1496314658 * msPerSec).toISOString(),
        destination: '03e7156ae33b0a208d0744199163177e909e80176e55d97a2f221ede0f934dd9ad',
        expires_at: new Date((1496314658 + 3600) * msPerSec).toISOString(),
        id: '0001020304050607080900010203040506070809000102030405060708090102',
        is_expired: true,
        network: 'bitcoin',
        tokens: 2000000,
      },
      invoice: 'lnbc20m1pvjluezhp58yjmdan79s6qqdhdzgynm4zwqd5d7xmw5fk98klysy043l2ahrqspp5qqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqypqfp4qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3q28j0v3rwgy9pvjnd48ee2pl8xrpxysd5g44td63g6xcjcu003j3qe8878hluqlvl3km8rm92f5stamd3jw763n3hck0ct7p8wwj463cql26ava',
    },
    {
      _: 'On testnet, no fallback address, small number of tokens',
      expected: {
        created_at: '2018-04-13T15:24:41.000Z',
        description: 'Read Article: Soros Entering Bitcoin Market Be',
        destination: '0220f9fae5058ec9ddb46b4839b04298affa18913f104081aedd680816fb8165e3',
        expires_at: '2018-04-13T16:24:41.000Z',
        id: 'a8b626e4f842ca9157106d4854064c5550634cda9cd343bb9a0d117ff4406cec',
        is_expired: true,
        network: 'testnet',
        tokens: 150,
      },
      invoice: 'lntb1500n1pddpjaepp54zmzde8cgt9fz4csd4y9gpjv24gxxnx6nnf58wu6p5ghlazqdnkqdz22fjkzepqg9e8g6trd3jn5gzndaex7ueqg4h8getjd9hxwgzzd96xxmmfdcsy6ctjddjhggzzv5cqzysp3mwgxdlhzxlj748qwsvmye6v062lpfnvwxmfadw3qfuktj4463nk4ms06zjculkp0sz9k3sklr3ee9x0wsya6x2takk5mpzyjpcuuspaqazd9',
    },
    {
      expected: {
        created_at: '2018-04-15T03:21:40.000Z',
        description: 'Add :zap:',
        destination: '0220f9fae5058ec9ddb46b4839b04298affa18913f104081aedd680816fb8165e3',
        expires_at: '2018-04-15T04:21:40.000Z',
        id: '876243596ba7c9cc9ad8925fdb92a681143e262292f00cddf0758027117f551a',
        is_expired: true,
        network: 'testnet',
        tokens: 150,
      },
      invoice: 'lntb1500n1pdd932ypp5sa3yxktt5lyuexkcjf0ahy4xsy2ruf3zjtcqeh0swkqzwytl25dqdq0g9jxggp60fshqwscqzysx4kfvu5a6f95zxw9lqjlv5nkvnfrwp509lhrttungj6jrthewtczr9csjl69u54dkcneq99s7ke57j9dlkufmvly5k4z7yn0c09ns0qpzlc6md',
    },
    {
      expected: {
        created_at: new Date(1533923529 * msPerSec).toISOString(),
        description: '',
        destination: '032bb4f2cd2bf877429f1d79f91de0794e4a3b7b772febbf60fc21bb3475f7cd5e',
        expires_at: new Date((1533923529 + 172800) * msPerSec).toISOString(),
        id: '5c23c315170c4fc9b1020641651aae17021d7f2488160fc759bbcb666af771c6',
        is_expired: true,
        mtokens: '493020',
        network: 'testnet',
        tokens: 493,
      },
      invoice: 'lntb4930200p1pdkm5xfrzjqwfn3p9278ttzzpe0e00uhyxhned3j5d9acqak5emwfpflp8z2cng99y0sqqqgcqqqqqqqlgqqqqqeqqjqfppqvzxxvnahw6gkj9aqpptktxpt6906cn2sdqqxqy9gcqpp5ts3ux9ghp38unvgzqeqk2x4wzupp6ley3qtql36eh09kv6hhw8rqlsewhluvdsc05q8pcfwnrfplrglgzlzqmgkzamrhvxj8lep7hhajx6pu5s3ay6pjunw679nx9nrvkdl52n9l273ah4rxwm4tj8fcjcqqh4ku2d',
    },
  ],
};

fixtures.test_cases.forEach(({expected, invoice}) => {
  const details = parseInvoice({invoice});

  equal(details.created_at, expected.created_at, 'IncorrectCreatedAt');
  equal(details.description, expected.description, 'IncorrectDescription');
  equal(details.destination, expected.destination, 'IncorrectDestination');
  equal(details.expires_at, expected.expires_at, 'IncorrectExpiresAt');
  equal(details.id, expected.id, 'IncorrectId');
  equal(details.is_expired, expected.is_expired, 'IncorrectExpiry');
  equal(details.network, expected.network, 'IncorrectNetwork');
  equal(details.tokens, expected.tokens, 'IncorrectTokens');
  if (expected.mtokens) {
    equal(details.mtokens, expected.mtokens, 'IncorrectMilliTokens');
  }

  return;
});

