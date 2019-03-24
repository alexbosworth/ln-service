# Lightning Network Service

[![npm version](https://badge.fury.io/js/ln-service.svg)](https://badge.fury.io/js/ln-service)

## Overview

The core of this project is a gRPC interface for node.js projects, available
through npm.

The project can be run alone to create a simplified REST interface on top of
[LND](https://github.com/lightningnetwork/lnd) that exposes functionality to
client applications.

It is recommended to not expose the REST interface directly to the dangerous
internet as that gives anyone control of your node.

The service can run in two modes:

1. As a library that can be used directly with [GRPC](https://grpc.io/)
2. A standalone REST service that uses a simplified authentication secret key.

The direct GRPC mode is recommended.

## Installing LND

https://github.com/lightningnetwork/lnd/blob/master/docs/INSTALL.md

If using Bitcoin Core, the following ~/.bitcoin/bitcoin.conf configuration is
recommended:

```ini
assumevalid= // plug in the current best block hash
daemon=1
dbcache=3000
disablewallet=1
rpcpassword= // make a strong password
rpcuser=bitcoinrpc
server=1
testnet=1 // Set as applicable
zmqpubrawblock=tcp://127.0.0.1:28332
zmqpubrawtx=tcp://127.0.0.1:28333
```

Sample LND configuration options (~/.lnd/lnd.conf)

```ini
[Application Options]
externalip=IP
rpclisten=0.0.0.0:10009

[Bitcoin]
bitcoin.active=1
bitcoin.mainnet=1
bitcoin.node=bitcoind
```

If you are interacting with your node remotely, make sure to set (in
`[Application Options]`)

```ini
tlsextraip=YOURIP
```

If using a domain for your LND, use the domain option:

```ini
tlsextradomain=YOURDOMAIN
```

If you're adding TLS settings, regenerate the cert and key by stopping lnd,
deleting the tls.cert and tls.key - then restart lnd to regenerate.

If you're going to use extended gRPC APIs, make sure to add the APIs to make
tags. `make install tags="autopilotrpc chainrpc invoicesrpc signrpc walletrpc"`

## Using gRPC

You can install ln-service service via npm

    npm install ln-service

**The `GRPC_SSL_CIPHER_SUITES` environment variable is needed for LND certs**

    export GRPC_SSL_CIPHER_SUITES='HIGH+ECDSA'

To set this, edit `~/.bash_profile` in MacOS or `~/.profile` in Linux, then do
`. ~/.bash_profile` or `. ~/.profile`

Run base64 on the tls.cert and admin.macaroon files to get the encoded
authentication data to create the LND connection. You can find these files in
the LND directory. (~/.lnd or ~/Library/Application Support/Lnd)

    base64 tls.cert
    base64 data/chain/bitcoin/mainnet/admin.macaroon

Be careful to avoid copying any newline characters.

You can then interact with your LND node directly:

```node
const lnService = require('ln-service');

const lnd = lnService.lightningDaemon({
  cert: 'base64 encoded tls.cert',
  macaroon: 'base64 encoded admin.macaroon',
  socket: '127.0.0.1:10009',
});

lnService.getWalletInfo({lnd}, (error, result) => {
  console.log(result);
});
```

Promises are also supported to allow async/await syntax

```node
const getWalletInfo = require('ln-service/getWalletInfo');

const walletInfo = await getWalletInfo({lnd});

console.log(walletInfo.public_key);
```

## Using as a Stand-Alone REST API Server

    git clone https://github.com/alexbosworth/ln-service.git
    cd ln-service
    npm install

### Configure

In REST mode:

For convenience in REST mode, you can make a `.env` file with `KEY=VALUE` pairs
instead of setting environment variables.

Environment variables:

    export GRPC_SSL_CIPHER_SUITES='HIGH+ECDSA'
    export LNSERVICE_CHAIN="bitcoin" // or litecoin
    export LNSERVICE_LND_DIR='~/.lnd/'
    export LNSERVICE_NETWORK="testnet" // or mainnet
    export LNSERVICE_SECRET_KEY=REPLACE!WITH!SECRET!KEY!

Setting environment variables in Linux:

- Edit `.bashrc` or `~/.profile`
- `$ source ~/.bashrc` in the window you are running the service from

Setting environment variables in MacOS:

- Edit `~/.bash_profile`
- `$ . ~/.bash_profile` in the window you are running the service from

Run the service:

    npm start

### REST API

Authentication is with Basic Authentication.  Make sure that the request has an
authorization header that contains Base64 encoded credentials.

    Authorization: Basic {{TOKEN_GOES_HERE_WITHOUT_BRACES}}

To generate the Base64 encoded credentials in Chrome for example in the console
you can:

    > let username = 'test';
    // username can be anything.
    > let password = '1m5secret4F';
    // password must match the LNSERVICE_SECRET_KEY in your env variables.
    > btoa(`${username}:${password}`);
    // dGVzdDoxbTVlY3JldDRG

And then set the value of the Authorization header to the returned value
`dGVzdDoxbTVlY3JldDRG`.

Copy the result as the token in the above example.

## Tests

Unit tests:

    $ npm test

Integration tests:

btcd and lnd are required to execute the integration tests.

    $ npm run integration-tests

