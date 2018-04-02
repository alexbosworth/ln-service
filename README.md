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

```
export GRPC_SSL_CIPHER_SUITES='HIGH+ECDSA'
export LNSERVICE_LND_DATADIR='~/.lnd/'
```

**Make sure to `$ source ~/.bashrc` in the window you are running the service from**

OSX -

Make sure your `.bash_profile` contains the following environment variables -

```
export GRPC_SSL_CIPHER_SUITES='HIGH+ECDSA'
export LNSERVICE_LND_DATADIR="$(home)/Library/Application Support/Lnd/"
```

**Make sure to `$ source ~/.bash_profile` in the window you are running the service from**

### Running ln-service

```
$ npm start
```

### Running the tests

```
$ npm test
```
