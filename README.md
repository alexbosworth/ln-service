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
datadir=/blockchain/.bitcoin/data
dbcache=3000
disablewallet=1
maxuploadtarget=1000
nopeerbloomfilters=1
peerbloomfilters=0
permitbaremultisig=0
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
maxpendingchannels=10
minchansize=250000
rpclisten=0.0.0.0:10009
tlsextraip=IP

[autopilot]
autopilot.active=1
autopilot.maxchannels=10
autopilot.minchansize=250000
autopilot.allocation=0.8

[Bitcoin]
bitcoin.active=1
bitcoin.feerate=1000
bitcoin.node=bitcoind
bitcoin.testnet=1
```

### Export Credentials (if using GRPC direct mode)

```
base64 ~/.lnd/admin.macaroon

base64 ~/.lnd/tls.cert
```

You will need these variables to authenticate with LND.

Make sure:
- If you are accessing the LND remotely that you added the external IP in conf
- If you added the external IP in the conf after starting LND regen the files (stop LND and then move or delete the files and LND will regen)
- Don't include newline artifacts in your base64 values

### Using as an npm package

You can install the service via npm -

    $ npm install ln-service

You can then interact with your LND node directly -

    const lnService = require('ln-service');

    const lnd = lnService.lightningDaemon({
      host: 'localhost:10009'
    });

    lnService.getWalletInfo({lnd}, (error, result) => {
      console.log(result);
    });

*NOTE*: You will need to make sure you [Set the Environment Variables](#configuring-environment-variables) unless you want to pass in base64 encoded values to the lightningDaemon for the cert and macaroon.

If you have encoded the values, use them to instantiate the lightningDaemon object.

    const lnd = lnService.lightningDaemon({
      cert: 'base64 encoded tls.cert'
      host: 'localhost:10009'
      macaroon: 'base64 encoded admin.macaroon'
    });

### Using as a stand-alone REST API

#### PREREQUISITES:

Please have `git` installed, and have a working github account, [preferably with SSH access](https://help.github.com/articles/connecting-to-github-with-ssh/).
Please also make sure that you have node.js / npm installed, too.
The best way to install it for personal use is [NVM](https://github.com/creationix/nvm#verify-installation).
Willingness to report bugs?

    git clone https://github.com/alexbosworth/ln-service.git
    cd ln-service
    npm install

### Configuring Environment Variables

**In NPM installed direct GRPC mode only `GRPC_SSL_CIPHER_SUITES` environment
variable is needed**

Linux -

Make sure your `.bashrc` or `~/.profile` contains the following environment variables -

    export GRPC_SSL_CIPHER_SUITES='HIGH+ECDSA'
    export LNSERVICE_LND_DIR='~/.lnd/'
    export LNSERVICE_SECRET_KEY=REPLACE!WITH!SECRET!KEY

**Make sure to `$ source ~/.bashrc` in the window you are running the service from**

MacOS -

Make sure your `~/.bash_profile` contains the following environment variables -

    export GRPC_SSL_CIPHER_SUITES='HIGH+ECDSA'
    export LNSERVICE_LND_DIR="$HOME/Library/Application Support/Lnd/"
    export LNSERVICE_SECRET_KEY=REPLACE!WITH!SECRET!KEY

**Make sure to `$ . ~/.bash_profile` in the window you are running the service from**

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

