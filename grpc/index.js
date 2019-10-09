const authenticatedLndGrpc = require('./authenticated_lnd_grpc');
const isLnd = require('./is_lnd');
const unauthenticatedLndGrpc = require('./unauthenticated_lnd_grpc');

module.exports = {authenticatedLndGrpc, isLnd, unauthenticatedLndGrpc};
