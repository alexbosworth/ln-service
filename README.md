# Lightning Network Service

## Overview

This project is a node.js REST interface on top of LND that exposes functionality to client applications.

It is recommended to not expose the REST interface directly to the dangerous internet as that gives anyone control of your node.

## Installation Instructions

### PREREQUISITES:

Please have `git` installed, and have a working github account, [preferably with SSH access](https://help.github.com/articles/connecting-to-github-with-ssh/).
Please also make sure that you have node.js / npm installed, too.
The best way to install it for personal use is [NVM](https://github.com/creationix/nvm#verify-installation).
Willingness to report bugs?

```
$ git clone https://github.com/alexbosworth/ln-service.git
$ cd ln-service
$ npm install
```

### Configuring ln-service

Linux -

Make sure your `.bashrc` contains the following environment variables -

    export GRPC_SSL_CIPHER_SUITES='HIGH+ECDSA'
    export LNSERVICE_LND_DIR='~/.lnd/'
    export LNSERVICE_SECRET_KEY=REPLACE!WITH!SECRET!KEY

**Make sure to `$ source ~/.bashrc` in the window you are running the service from**

OSX -

Make sure your `.bash_profile` contains the following environment variables -

    export GRPC_SSL_CIPHER_SUITES='HIGH+ECDSA'
    export LNSERVICE_LND_DIR="$HOME/Library/Application Support/Lnd/"
    export LNSERVICE_SECRET_KEY=REPLACE!WITH!SECRET!KEY

**Make sure to `$ . ~/.bash_profile` in the window you are running the service from**

### Running ln-service

```
$ npm start
```

### Making requests to ln-service

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
