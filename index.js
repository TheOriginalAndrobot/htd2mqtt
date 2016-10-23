#!/usr/bin/env node

var pkg = require('./package.json');
var config = require('./config.js');
var HTDLync = require('./htd.js');
var log = require('yalm');
var net = require('net');
var PassThrough = require('stream').PassThrough;
var Mqtt = require('mqtt');

log.setLevel(config.v);
log.info(pkg.name + ' ' + pkg.version + ' starting');

var serialConnected;
var mqttConnected;

// Individual parsed commands are dropped into this
var cmdStream = new PassThrough;

// Used by the raw incoming data parse logic to join data across TCP/Serial packets
var prevRawData = new Buffer(0);

var rawDataStream = new net.Socket();
var htd = new HTDLync(rawDataStream);


//
// Handling of incoming raw data
//

log.info('TCP serial bridge trying to connect on ' + config.tcpserialHost + ':' + config.tcpserialPort);
rawDataStream.connect({
    host: config.tcpserialHost,
    port: config.tcpserialPort
});

rawDataStream.on('connect', function () {
    log.info('TCP serial bridge connected');
    serialConnected = true;
    mqtt.publish(config.topic + '/connected', '2');
    
    // Ensure HTD device is in echo mode so we recieve responses
    htd.setEchoMode('on');
});

rawDataStream.on('error', function (err) {
    log.error('TCP serial bridge connection error: ' + err);
    serialConnected = false;
    mqtt.publish(config.topic + '/connected', '1');
});

rawDataStream.on('close', function () {
    log.info('TCP serial bridge connection closed');
    serialConnected = false;
    mqtt.publish(config.topic + '/connected', '1');
});

rawDataStream.on('data', function (data) {
    
    var str = " ";
    for (var ii = 0; ii < data.length; ii++) {
        str += ('0x' + data[ii].toString(16).toUpperCase() + ' ');
    }
    log.debug('received length:', data.length);
    log.debug('received data:', str);
    
    // TODO: parse incoming data
});

// Handle incoming raw data from device, parse out commands, send them for processing
rawDataStream.on('data', function (newRawData) {
    
    log.debug('Recieved', newRawData.length, 'bytes of raw incoming data');
    log.debug('Raw data (hex):', newRawData.toString('hex'));
    
    var cmd = 0x00;
    var len = 0;
    var offset = 0;
    var cmdPacket;
    var remainingBytes;
    
    // Pick up where we left off with any data left over from last time
    log.debug('Prepended previous raw data:', prevRawData.toString('hex'));
    var data = new Buffer(prevRawData.length + newRawData.length);
    prevRawData.copy(data);
    newRawData.copy(data, prevRawData.length);
    prevRawData = new Buffer(0);
    
    // Loop through each packet
    while (offset < data.length) {
        
        // Make sure we are at the start of a packet, if not go to next byte
        if (data[offset] != 0x02) {
            offset++;
            continue;
        }
        
        // How many bytes are left in the data buffer?
        remainingBytes = data.length - offset;
        
        // Do we not have enough to read the command byte? Then save the rest for next time.
        if ( remainingBytes < 4 ) {
            prevRawData = new Buffer(data.slice(offset));
            break;
        }
        
        // Determine command packet length based on type
        cmd = data[offset+3];
        switch (cmd) {
            case 0x1B:  // Echo error status
                len = 4+1+8+1;
                break;
            case 0x05:  // Zone internal status
            case 0x06:  // Audio and Keypad Exist channel
                len = 4+9+1;
                break;
            case 0x09:  // MP3 Play End
            case 0x13:  // MP3 ON
                len = 4+1+1;
                break;
            case 0x14:  // MP3 OFF
                // Additional 31 bytes is due to a bug in the HTD firmware
                len = 4+16+1+31;
                break;
            case 0x0C:  // Zone Source Name
            case 0x0D:  // Zone Name
            case 0x0E:  // Generic Name
                len = 4+13+1;
                break;
            // Un-handled, so bail on whole packet
            // TODO: Figure out how to deal with variable packet length for these cmds
            case 0x11:  // MP3 File Name
            case 0x12:  // MP3 Artist Name
            default:
                len = 1;
                log.warn('Unknown response recieved');
                log.debug(data.slice(offset));
                break;
        }
        
        // Not enough data to form a complete packet? Save for next time.
        if ( remainingBytes < len ) {
            prevRawData = new Buffer(data.slice(offset));
            break;
        }
        
        // Isolate this packet and drop in the queue
        if (len > 4) {
            cmdPacket = new Buffer(data.slice(offset, offset+len));
            cmdStream.write(cmdPacket);
        }
        
        // Continue to next packet
        offset = offset + len;
    }
    
    return;
});


//
// Handling of parsed incoming responses
//

// Fires each time a new command is dropped into the stream
cmdStream.on('readable', function () {
    var data = cmdStream.read();
    
    log.debug('Response received (hex data):', data.toString('hex'));
    
    // Check validity
    if ( !htd.validChecksum(data) ){
        log.warn('Response recieved with invalid checksum');
        return;
    }
    
    var zone = data[2];
    var cmd = data[3];
    var cmdName = '';
    var str = '';
    var strTerm = 0;
    var num = 0;
    var topic = config.topic + '/status/' + zone + '/';
    
    switch (cmd) {
        case 0x1B:  // Echo error status
            cmdName = 'Error';
            num = data.readUInt8(4);
            pubMQTT(topic+'error', num);
            break;
        case 0x05:  // Zone internal status
            cmdName = 'Zone Status';
            // Data1
            pubMQTT(topic+'power', (data[4] & 0x01<<0) ? 'ON' : 'OFF');
            pubMQTT(topic+'mute', (data[4] & 0x01<<1) ? 'ON' : 'OFF');
            pubMQTT(topic+'dnd', (data[4] & 0x01<<2) ? 'ON' : 'OFF');
            // Data2
            pubMQTT(topic+'party', (data[5] & 0x01<<5) ? 'ON' : 'OFF');
            pubMQTT(topic+'alloff', (data[5] & 0x01<<6) ? 'ON' : 'OFF');
            pubMQTT(topic+'allon', (data[5] & 0x01<<7) ? 'ON' : 'OFF');
            // Data5
            pubMQTT(topic+'source', data.readUInt8(8).toString());
            // Data6
            num = (data[9] == 0x00) ? 60 : (data.readUInt8(9) - 0xC4);
            pubMQTT(topic+'volume', num.toString());
            break;
        case 0x06:  // Audio and Keypad Exist channel
            cmdName = 'Exist Status';
            var zoneBits = data[5] | data[7]<<8;
            var keypadBits = data[6] | data[8]<<8;
            for (var zz=0; zz<12; zz++){
                str = (zoneBits & 0x01<<zz) ? '1' : '0';
                pubMQTT(config.topic + '/status/' + (zz+1) + '/exists', str);
                str = (keypadBits & 0x01<<zz) ? '1' : '0';
                pubMQTT(config.topic + '/status/' + (zz+1) + '/keypadpresent', str);
            }
            break;
        case 0x09:  // MP3 Play End
            cmdName = 'MP3 Play End Stop';
            pubMQTT(topic+'mp3', 'end');
            break;
        case 0x13:  // MP3 ON
            cmdName = 'MP3 On';
            pubMQTT(topic+'mp3', 'on');
            break;
        case 0x14:  // MP3 OFF
            cmdName = 'MP3 Off';
            // Additional 31 bytes is due to a bug in the HTD firmware
            //str = data.toString('utf8', 4, 19+31);
            pubMQTT(topic+'mp3', 'off');
            break;
        case 0x0C:  // Zone Source Name
        case 0x0E:  // Zone Source Name (undocumented)
            cmdName = 'Source Name';
            str = data.toString('utf8', 4, 14).split("\0").shift();
            num = data.readUInt8(15)+1;
            pubMQTT(topic+'sourcename/'+num, str);
            break;
        case 0x0D:  // Zone Name
            cmdName = 'Zone Name';
            str = data.toString('utf8', 4, 14).split("\0").shift();
            num = data.readUInt8(15);
            pubMQTT(topic+'name', str);
            break;
    }
    
    log.debug('Completed incoming response', cmdName);
    
});

function pubMQTT(topic, payload){
    log.debug('mqtt >', topic, payload);
    mqtt.publish(topic, payload);
}


//
// Handling of incoming MQTT messages
//

log.info('mqtt trying to connect to', config.url);
var mqtt = Mqtt.connect(config.url, {will: {topic: config.topic + '/connected', payload: '0'}});

mqtt.on('connect', function () {
    mqttConnected = true;
    log.info('mqtt connected ' + config.url);
    mqtt.publish(config.topic + '/connected', serialConnected ? '2' : '1');
    log.info('mqtt subscribe', config.topic + '/set/+/+');
    mqtt.subscribe(config.topic + '/set/+/+');

});

mqtt.on('close', function () {
    if (mqttConnected) {
        mqttConnected = false;
        log.info('mqtt closed ' + config.url);
    }
});

mqtt.on('error', function (error) {
    log.error('mqtt error ' + error);
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

    switch (cmd) {
        case 'power':
            htd.setPower(zone, payload);
            break;
        case 'volume':
            htd.setVolume(zone, payload);
            break;
        case 'source':
            htd.setSource(zone, payload);
            break;
        case 'mute':
            htd.setMute(zone, payload);
            break;
        case 'dnd':
            htd.setDND(zone, payload);
            break;
    }

});


//
// Grab initial data
//

setTimeout(function() {
    
    if (!serialConnected || !mqttConnected) {
        log.error('Could not query initial info because connections not ready');
        return;
    }
    
    log.info('Querying initial Zone Status');
    htd.queryZoneStatus();
    
    log.info('Querying initial Zone & Source Names');
    for (var zone=1; zone<=12; zone++){
        htd.queryZoneName(zone);
        for (var src=1; src<=18; src++){
            htd.querySourceName(zone, src);
        }
    }
    
}, 4000);

/*
setTimeout(function() {
    
    log.info('queryFullStatus');
    htd.queryFullStatus(0);
    
}, 8000);
*/