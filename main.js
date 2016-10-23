var HTDLync = require('./htd.js');
var log = require('yalm');
log.setLevel('debug');
var net = require('net');
var PassThrough = require('stream').PassThrough;

var cmdStream = new PassThrough;
var prevData = new Buffer(0);

var client = new net.Socket();
var htd = new HTDLync(client);

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

/*
client.on('data', function (data) {
    console.log('Data incoming:');
    console.log(data);
    console.log('');
});
*/

/*
client.on('data', function (data) {
    
    var str = " ";
    for (var ii = 0; ii < data.length; ii++) {
        str += ('0x' + data[ii].toString(16).toUpperCase() + ' ');
    }
    
    log.debug('received checksum:', htd.validChecksum(data));
    log.debug('received length:', data.length);
    log.debug('received data:', str);
    
    parseIncoming(data);
    // TODO: parse incoming data
});
*/

//client.on('readable', function () {
/*setInterval(function() {
    var header1;    // First byte, always 0x02
    var header2;    // Next three bytes: {0x00, [zone], [cmd]}
    var cmd;
    var len;
    console.log("Interval");
    console.log(inputStream);
    while (null !== (header1 = inputStream.read(1))) {
        // Check for valid header byte
        if (header1[0] == 0x02){

            if (null !== (header2 = inputStream.read(3))) {
                cmd = header2[2];
                // Decode the length
                switch (cmd) {
                    case 0x1B:
                        len = 1+8+1;
                        break;
                    case 0x05:
                    case 0x06:
                        len = 9+1;
                        break;
                    case 0x09:
                    case 0x13:
                        len = 1+1;
                        break;
                    case 0x14:
                        len = 17+1;
                        break;
                    case 0x0C:
                    case 0x0D:
                        len = 13+1;
                        break;
                    //Un-handled, so bail on whole packet
                    case 0x11:
                    case 0x12:
                    default:
                        len = 0;
                        break;
                }
                if (null !== (data = inputStream.read(len))) {
                    console.log(header1);
                    console.log(header2);
                    console.log(data);
                }
                else {
                    // Need to wait for more data
                    inputStream.unshift(header2);
                    inputStream.unshift(header1);
                }
                
            }
            else {
                // Need to wait for more data
                inputStream.unshift(header1);
                console.log('Unshifting:');
                console.log(header1);
            }
                
        }
        else {
            // Not a valid header byte, so move on to the next byte
        }
    }
}, 1000);
*/

cmdStream.on('readable', function () {
    var data = cmdStream.read();
    
/*
    console.log('');
    console.log("Command recieved:");
    console.log(data);
    console.log('');
*/
    
    // Check validity
    if ( !htd.validChecksum(data) ){
        log.warn('Response recieved with invalid checksum');
        log.debug(data);
        log.debug(data.toString('hex'));
        return;
    }
    
    var zone = data[2];
    var cmd = data[3];
    var cmdName = '';
    var str = '';
    var strTerm = 0;
    var num = 0;
    
    switch (cmd) {
        case 0x1B:  // Echo error status
            cmdName = 'Error status';
            num = data.readUInt8(4);
            console.log(cmdName, num);
            break;
        case 0x05:  // Zone internal status
            cmdName = 'Zone status';
            console.log(cmdName, zone, data.slice(4,12).toString('hex'));
            break;
        case 0x06:  // Audio and Keypad Exist channel
            cmdName = 'Exist status';
            num = data.readUInt32LE(4);
            console.log(cmdName, num.toString(16));
            break;
        case 0x09:  // MP3 Play End
            cmdName = 'MP3 Play End Stop';
            console.log(cmdName);
            break;
        case 0x13:  // MP3 ON
            cmdName = 'MP3 On';
            console.log(cmdName);
            break;
        case 0x14:  // MP3 OFF
            cmdName = 'MP3 Off';
            // Additional 31 bytes is due to a bug in the HTD firmware
            //str = data.toString('utf8', 4, 19+31);
            console.log(cmdName);
            break;
        case 0x0C:  // Zone Source Name
        case 0x0E:  // Zone Source Name (undocumented)
            cmdName = 'Source Name';
            str = data.toString('utf8', 4, 14).split("\0").shift();
            num = data.readUInt8(15)+1;
            console.log(cmdName, zone, num, str);
            break;
        case 0x0D:  // Zone Name
            cmdName = 'Zone Name';
            str = data.toString('utf8', 4, 14).split("\0").shift();
            num = data.readUInt8(15);
            console.log(cmdName, zone, num, str);
            break;
        //Un-handled, so bail on whole packet
        case 0x11:  // MP3 File Name
        case 0x12:  // MP3 Artist Name
        default:
            log.warn('Response recieved for unsupported command');
            log.debug('Command: 0x' + cmd.toString(16));
            len = 1;
            break;
    }
    
    
});





setTimeout(function() {
    
    log.info('setPower');
    htd.setPower(7,'Off');
    
}, 2000);

setTimeout(function() {
    
    log.info('setSource');
    htd.setSource(7,13);
    
}, 2500);

setTimeout(function() {
    
    log.info('setVolume');
    htd.setVolume(7,35);
    
}, 3000);

setTimeout(function() {
    
    log.info('queryZoneStatus');
    htd.queryZoneStatus();
    
}, 4000);

/*
setTimeout(function() {
    
    log.info('queryFullStatus');
    htd.queryFullStatus(0);
    
}, 5000);
*/

setTimeout(function() {
    
    log.info('queryZoneName');
    for (var ii=1; ii <=12; ii++){
        htd.queryZoneName(ii);
    }
    
}, 8000);

setTimeout(function() {
    
    log.info('querySourceName for Zone 1');
        for (var ii=1; ii <=18; ii++){
        htd.querySourceName(1, ii);
    }
    
}, 9000);

setTimeout(function() {
    
    log.info('setMute');
    htd.setMute(7, 'on');
    
}, 10000);

setTimeout(function() {
    
    log.info('setDND');
    htd.setDND(7, 'ON');
    
}, 11000);

setTimeout(function() {
    
    log.info('setEchoMode');
    htd.setEchoMode('on');
    
}, 12000);

setTimeout(function() {
    
    log.info('setMute');
    htd.setMute(7, 'Off');
    
}, 14000);


setTimeout(function() {
    
    log.info('queryFullStatus');
    htd.queryFullStatus();
    
}, 15000);



// Handle incoming data, break into packets, parse data, and publish it to MQTT
//var parseIncoming = function (data) {
client.on('data', function (newData) {
    
    //console.log(newData.toString('hex'));
    
    var cmd = 0x00;
    var len = 0;
    var offset = 0;
    var cmdPacket;
    var remainingBytes;
    
    // Pick up where we left off
    var data = new Buffer(prevData.length + newData.length);
    prevData.copy(data);
    newData.copy(data, prevData.length);
    prevData = new Buffer(0);
    
    // Loop through each packet
    while (offset < data.length) {
        
        // Make sure we are at the start of a packet
        if (data[offset] != 0x02) {
            offset++;
            continue;
        }
        
        // How many bytes are left in the data buffer?
        remainingBytes = data.length - offset;
        
        // Can we not even read the command byte? Save for next time.
        if ( remainingBytes < 4 ) {
            prevData = new Buffer(data.slice(offset));
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
            //Un-handled, so bail on whole packet
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
            prevData = new Buffer(data.slice(offset));
            break;
        }
        
        // Isolate this packet and drop in the queue
        cmdPacket = new Buffer(data.slice(offset, offset+len));
        cmdStream.write(cmdPacket);
        
        // Continue to next packet
        offset = offset + len;
    }
    
    return;
});