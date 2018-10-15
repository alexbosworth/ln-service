# Lightning Network Service

[![npm version](https://badge.fury.io/js/ln-service.svg)](https://badge.fury.io/js/ln-service)

## Overview

The core of this project is a gRPC interface for node.js projects, available through npm.

The project can be run alone to create a simplified REST interface on top of LND that exposes functionality to client applications.

It is recommended to not expose the REST interface directly to the dangerous internet as that gives anyone control of your node.

## Installation Instructions

The service can run in two modes:

1. As a library that can be used directly with [GRPC](https://grpc.io/) against LND
2. A standalone REST service that uses a simplified authentication for RPC calls.

The direct GRPC mode is recommended.

### Install LND and/or your Bitcoin Chain Daemon

https://github.com/lightningnetwork/lnd/blob/master/docs/INSTALL.md

If using Bitcoin Core, the following ~/.bitcoin/bitcoin.conf configuration is recommended:

```
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

```
[Application Options]
externalip=IP
rpclisten=0.0.0.0:10009
tlsextraip=IP

[Bitcoin]
bitcoin.active=1
bitcoin.mainnet=1
bitcoin.node=bitcoind
```

### Using in GRPC mode as an npm package

You can install the service via npm -

    $ npm install ln-service

Run base64 on the tls.cert and admin.macaroon files to get the encoded
authentication data to create the LND connection. You can find these files in
the LND directory. (~/.lnd or ~/Library/Application Support/Lnd)

    $ base64 tls.cert
    $ base64 data/chain/bitcoin/mainnet/admin.macaroon

Be careful to avoid copying any newline characters.

You can then interact with your LND node directly:

    const lnService = require('ln-service');
    
    const lnd = lnService.lightningDaemon({
      cert: 'base64 encoded tls.cert',
      macaroon: 'base64 encoded admin.macaroon',
      socket: 'localhost:10009',
    });
    
    lnService.getWalletInfo({lnd}, (error, result) => {
      console.log(result);
    });

Promises are also supported to allow async/await syntax

    const getWalletInfo = require('ln-service/getWalletInfo');
    
    const walletInfo = await getWalletInfo({lnd});
    
    console.log(walletInfo.public_key);

If you are interacting with your node remotely, make sure to set:

    tlsextraip=YOURIP

In the lnd.conf file for your LND, and regenerate TLS certs by deleting them.

If using a domain for your LND, use the domain option:

    tlsextradomain=YOURDOMAIN

### Using as a stand-alone REST API

    git clone https://github.com/alexbosworth/ln-service.git
    cd ln-service
    npm install

### Configuring Environment Variables

**In NPM installed direct GRPC mode only `GRPC_SSL_CIPHER_SUITES` environment
variable is needed**

    export GRPC_SSL_CIPHER_SUITES='HIGH+ECDSA'

In REST mode:

For convenience in REST mode, you can make a .env file with `KEY=VALUE` pairs
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

### Running REST API

    $ npm start

### Making HTTP requests to the REST API

`ln-service` uses Basic Authentication currently.  Make sure that the request has an authorization header that contains Base64 encoded credentials.

Basic example of an authorization header -

    Authorization: Basic {{TOKEN_GOES_HERE_WITHOUT_BRACES}}

To generate the Base64 encoded credentials in Chrome for example in the console you can -

    > let username = 'test';
    // username can be anything.
    > let password = '1m5secret4F';
    // password must match the LNSERVICE_SECRET_KEY in your environment variables.
    > btoa(`${username}:${password}`);
    // dGVzdDoxbTVlY3JldDRG

And then set the value of the Authorization header to the returned value `dGVzdDoxbTVlY3JldDRG`.

And copy the result as the token in the above example

### Running the tests

    $ npm test

#### Integration Tests

btcd and lnd are required to execute the integration tests.

    $ tap test/integration/*.js

