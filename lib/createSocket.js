var WebSocket = require('ws');
var debug = require('debug')('BitMEX:realtime-api:socket');
var signMessage = require('./signMessage');

module.exports = function createSocket(options, emitter) {
  'use strict';
  var endpoint = options.endpoint;
  if (options.apiKeyID && options.apiKeySecret) {
    endpoint += '?' + signMessage.getWSAuthQuery(options.apiKeyID, options.apiKeySecret);
  }
  debug('connecting to %s', endpoint);
  var socket = new WebSocket(endpoint);

  socket.on('open', function() {
    socket.opened = true;
    debug('Connection to BitMEX at', endpoint, 'opened.');
  });

  socket.on('message', function(data) {
    try {
      data = JSON.parse(data);
    } catch(e) {
      emitter.emit('error', 'Unable to parse incoming data:', data);
      return;
    }

    if (data.error) return emitter.emit('error', data.error);
    if (!data.data) return; // connection or subscription notice

    // If no data was found, stub the symbol. At least we'll get keys.
    var symbol = data.data[0] && data.data[0].symbol || 'stub';

    // On getSymbol(), returns 'orderBook25', we want to transparently turn that into 'orderBook'
    if (data.table === 'orderBook25') data.table = 'orderBook';

    // Fires events as <table>:<symbol>:<action>, such as
    // instrument:XBU24H:update
    var key = data.table + ':' + symbol + ':' + data.action;
    debug('emitting %s with data %j', key, data);
    emitter.emit(key, data);
  });

  socket.on('error', function(e) {
    var listeners = emitter.listeners('error');
    // If no error listeners are attached, throw.
    if (!listeners.length) throw e;
    else emitter.emit('error', e);
  });

  return socket;
};
