var htd = require('./htd.js');
var log = require('yalm');
log.setLevel('debug');
var net = require('net');


var client = new net.Socket();
//client.setEncoding(null);
client.connect({
    host: '192.168.0.16',
    port: 2101
});

client.on('connect', function () {
    log.info('TCP serial bridge connected');
});

client.on('error', function (err) {
    log.error('TCP serial bridge connection error: ' + err);
});

client.on('close', function () {
    log.info('TCP serial bridge connection closed');
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

setTimeout(function() {
    
    /*
    log.info('Send cmd to zone 7...');
    var cmd = new Buffer([0x02, 0x00, 0x07, 0x15, 0xE2, 0x00]);
    client.write(cmd);
    */
    
    log.info('Send cmd to zone 7...');
    htd.queryAllStatus(client);
    
}, 3000);

/**/
setTimeout(function() {
    
    log.info('Send cmd to zone 7...');
    htd.setSource(client, '7','13');
    
}, 5000);
/**/
