#!/usr/bin/env node

var pkg = require('./package.json');
var config = require('./config.js');
var htd = require('./htd.js');
var log = require('yalm');
log.setLevel(config.v);
var net = require('net');

log.info(pkg.name + ' ' + pkg.version + ' starting');

var serialConnected;

log.info('TCP serial bridge trying to connect on ' + config.tcpserialHost + ':' + config.tcpserialPort);

var client = new net.Socket();

client.connect({
    host: config.tcpserialHost,
    port: config.tcpserialPort
});

client.on('connect', function () {
    log.info('TCP serial bridge connected');
    serialConnected = true;
    mqtt.publish(config.name + '/connected', '2');
});

client.on('error', function (err) {
    log.error('TCP serial bridge connection error: ' + err);
    serialConnected = false;
    mqtt.publish(config.name + '/connected', '1');
});

client.on('close', function () {
    log.info('TCP serial bridge connection closed');
    serialConnected = false;
    mqtt.publish(config.name + '/connected', '1');
});

client.on('data', function (data) {
    
    var str = " ";
    for (var ii = 0; ii < data.length; ii++) {
        str += ('0x' + data[ii].toString(16).toUpperCase() + ' ');
    }
    log.debug('received checksum:', htd.validChecksum(data));
    log.debug('received length:', data.length);
    log.debug('received data:', str);
    
    // TODO: parse incoming data
});

/*
lirc.on('receive', function (remote, command, repeats) {
    log.debug('receive', remote, command, repeats);
    var topic = config.n + '/status/' + remote + '/' + command;
    var payload;
    if (config.json) {
        payload = JSON.stringify({
            val: parseInt(repeats, 10)
        });
    } else {
        payload = '' + parseInt(repeats, 10);
    }
    log.debug('mqtt >', topic, payload);
    mqtt.publish(topic, payload);
});
*/


var Mqtt = require('mqtt');

if (typeof config.topic !== 'string') config.topic = '';
if (config.topic !== '' && !config.topic.match(/\/$/)) config.topic = config.topic + '/';

var mqttConnected;

log.info('mqtt trying to connect', config.url);
var mqtt = Mqtt.connect(config.url, {will: {topic: config.name + '/connected', payload: '0'}});

mqtt.on('connect', function () {
    mqttConnected = true;
    log.info('mqtt connected ' + config.url);
    mqtt.publish(config.name + '/connected', serialConnected ? '2' : '1');
    log.info('mqtt subscribe', config.name + '/set/+/+');
    mqtt.subscribe(config.name + '/set/+/+');

});

mqtt.on('close', function () {
    if (mqttConnected) {
        mqttConnected = false;
        log.info('mqtt closed ' + config.url);
    }
});

mqtt.on('error', function () {
    log.error('mqtt error ' + config.url);
});

mqtt.on('message', function (topic, payload) {
    payload = payload.toString();
    log.debug('mqtt <', topic, payload);

    if (!serialConnected) {
        log.error('TCP serial bridge disconnected. Can\'t send command.');
        return;
    }

    var parts = topic.split('/');
    var zone = parts[parts.length-2];
    var cmd = parts[parts.length-1];
    
    log.debug('htd > zone:', zone, 'command:', cmd, 'value:', payload);

    if (cmd == 'power') {
        htd.setPower(client, zone, payload);
    }
    else if (cmd == 'volume') {
        htd.setVolume(client, zone, payload);
    }
    else if (cmd == 'source') {
        htd.setSource(client, zone, payload);
    }

});