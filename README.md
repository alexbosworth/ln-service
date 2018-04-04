# Lightning Network Service

## Overview

The core of this project is a gRPC interface for node.js projects, available through npm.

The project can be run alone to create a REST interface on top of LND that exposes functionality to client applications.

It is recommended to not expose the REST interface directly to the dangerous internet as that gives anyone control of your node.

## Installation Instructions

### As an npm package

You can install the service via npm -

```
$ npm install ln-service
```

You can then interact with your LND node directly -

```
const lnService = require('ln-service');

const lnd = lnService.lightningDaemon({
  host: 'localhost:10009'
});

lnService.getWalletInfo({lnd}, (error, result) => {
  console.log(result);
});
```

*NOTE*: You will need to make sure you [Set the Environment Variables](#configuring-environment-variables) unless you want to pass in base64 encoded values to the lightningDaemon for the cert and macaroon.

### As a stand-alone REST API

#### PREREQUISITES:

Please have `git` installed, and have a working github account, [preferably with SSH access](https://help.github.com/articles/connecting-to-github-with-ssh/).
Please also make sure that you have node.js / npm installed, too.
The best way to install it for personal use is [NVM](https://github.com/creationix/nvm#verify-installation).
Willingness to report bugs?

```
$ git clone https://github.com/alexbosworth/ln-service.git
$ cd ln-service
$ npm install
```

### Configuring Environment Variables

Linux -

Make sure your `.bashrc` contains the following environment variables -

```
export GRPC_SSL_CIPHER_SUITES='HIGH+ECDSA'
export LNSERVICE_LND_DATADIR='~/.lnd/'
export LNSERVICE_SECRET_KEY='1m5ecret4F'
```

**Make sure to `$ source ~/.bashrc` in the window you are running the service from**

OSX -

Make sure your `.bash_profile` contains the following environment variables -

```
export GRPC_SSL_CIPHER_SUITES='HIGH+ECDSA'
export LNSERVICE_LND_DATADIR="$(home)/Library/Application Support/Lnd/"
export LNSERVICE_SECRET_KEY='1m5ecret4F'
```

**Make sure to `$ source ~/.bash_profile` in the window you are running the service from**


### Running REST API

```
$ npm start
```

### Making HTTP requests to the REST API

`ln-service` uses Basic Authentication currently.  Make sure that the request has an authorization header that contains Base64 encoded credentials.

Basic example of an authorization header -

```
Authorization: Basic {{TOKEN_GOES_HERE_WITHOUT_BRACES}}
```

To generate the Base64 encoded credentials in Chrome for example in the console you can -

```
> let username = 'test';
> let password = '1m5secret4F';
> btoa(`${username}:${password}`);
// dGVzdDoxbTVlY3JldDRG
```

And then set the value of the Authorization header to the returned value `dGVzdDoxbTVlY3JldDRG`.

And copy the result as the token in the above example

### Running the tests

```
$ npm test
```
