//
// HTD Lync device class
//

// Constructor, expects a socket/stream to write device commands into and a yalm logger
function HTDLync(sock, log) {
    this.sock = sock;
    this.log = log;
};

// Change zone power state ('On', 'Off', '1', or '0')
HTDLync.prototype.setPower = function(zone, power) {
    
    powerStr = power.toString().toLowerCase();
    
    var packet = new Buffer([0x02, 0x00, 0x00, 0x04, 0x58]);
    packet.writeUInt8(this.cleanZone(zone), 2);

    if (powerStr == 'on' || powerStr == '1'){
        packet.writeUInt8(0x57, 4);
    }
    else if (powerStr == 'off' || powerStr == '0'){
        packet.writeUInt8(0x58, 4);
    }
    else {
        this.log.warn('Unknown setPower argument:', powerStr);
        return;
    }
    
    var dataOut = addChecksum(packet);
    this.log.debug('Sending setPower command:', dataOut.toString('hex'));
    this.sock.write(dataOut);
};

// Change zone mute state ('On', 'Off', '1', or '0')
HTDLync.prototype.setMute = function(zone, mute) {
    
    muteStr = mute.toString().toLowerCase();
    
    var packet = new Buffer([0x02, 0x00, 0x00, 0x04, 0x1F]);
    packet.writeUInt8(this.cleanZone(zone), 2);

    if (muteStr == 'on' || muteStr == '1'){
        packet.writeUInt8(0x1E, 4);
    }
    else if (muteStr == 'off' || muteStr == '0'){
        packet.writeUInt8(0x1F, 4);
    }
    else {
        this.log.warn('Unknown setMute argument:', muteStr);
        return;
    }
    
    var dataOut = addChecksum(packet);
    this.log.debug('Sending setMute command:', dataOut.toString('hex'));
    this.sock.write(dataOut);
};

// Change zone DND state ('On', 'Off', '1', or '0')
HTDLync.prototype.setDND = function(zone, dnd) {
    
    dndStr = dnd.toString().toLowerCase();
    
    var packet = new Buffer([0x02, 0x00, 0x00, 0x04, 0x5A]);
    packet.writeUInt8(this.cleanZone(zone), 2);

    if (dndStr == 'on' || dndStr == '1'){
        packet.writeUInt8(0x59, 4);
    }
    else if (dndStr == 'off' || dndStr == '0'){
        packet.writeUInt8(0x5A, 4);
    }
    else {
        this.log.warn('Unknown setDND argument:', dndStr);
        return;
    }
    
    var dataOut = addChecksum(packet);
    this.log.debug('Sending setDND command:', dataOut.toString('hex'));
    this.sock.write(dataOut);
};

// Set zone source by number (0-18)
HTDLync.prototype.setSource = function(zone, source) {
    
    var sourceNum = this.cleanSource(source);
    var sourceByte = 0x10;  // Input 1 by default
    
    if (sourceNum >= 1 && sourceNum <=12){
        sourceByte = 0x10 + (sourceNum - 1);
    }
    else if (sourceNum >= 13 && sourceNum <=18){
        sourceByte = 0x63 + (sourceNum - 13);
    }
    else {
        this.log.warn('Unknown setSource argument:', source);
        return;
    }
    
    var packet = new Buffer([0x02, 0x00, 0x00, 0x04, 0x10]);
    packet.writeUInt8(this.cleanZone(zone), 2);
    packet.writeUInt8(sourceByte, 4);
    
    var dataOut = addChecksum(packet);
    this.log.debug('Sending setSource command:', dataOut.toString('hex'));
    this.sock.write(dataOut);
};

// Set zone volume (0-60)
HTDLync.prototype.setVolume = function(zone, vol) {
    
    var volNum = parseInt(vol.toString(), 10);
    
    if (isNaN(volNum) || volNum < 0 || volNum > 60){
        this.log.warn('Out of bounds volume', vol, 'was ignored');
        return;
    }
    
    // For volume command, level 60 is 0x00, 59 is 0xFF, and 0 is 0xC4
    var volByte = volNum + 0x0C4;
    volByte = volByte & 0x0FF;
    
    var packet = new Buffer([0x02, 0x00, 0x00, 0x15, 0x43]);
    packet.writeUInt8(this.cleanZone(zone), 2);
    packet.writeUInt8(volByte, 4);
    
    var dataOut = addChecksum(packet);
    this.log.debug('Sending setVolume command:', dataOut.toString('hex'));
    this.sock.write(dataOut);
};

// Set zone volume by percentage (0-100)
HTDLync.prototype.setVolumeByPercent = function(zone, percent) {
    
    var percentNum = parseInt(percent.toString(), 10);
    
    if (isNaN(percentNum) || percentNum < 0 || percentNum > 100){
        this.log.warn('Out of bounds volume percent', percent, 'was ignored');
        return;
    }
    
    var volNum = 60*(percentNum/100);
    this.setVolume(zone, volNum);
}

// Status for all zones
HTDLync.prototype.queryZoneStatus = function() {
    var packet = new Buffer([0x02, 0x00, 0x00, 0x05, 0x00]);
    var dataOut = addChecksum(packet);
    this.log.debug('Sending queryZoneStatus command:', dataOut.toString('hex'));
    this.sock.write(dataOut);
};

/* Query a lot of things...
    1. Echo All Zone Status.
    2. Echo All Zone Name.
    3. Echo All Source Name
    4. Echo MP3 On/Off
    5. Echo MP3 File Name and Artist Name
  Note that the "MP3 Off" resposne is broken and may not work right.
  It is not recommended that this command be used!
*/
HTDLync.prototype.queryFullStatus = function() {
    var packet = new Buffer([0x02, 0x00, 0x01, 0x0C, 0x00]);
    var dataOut = addChecksum(packet);
    this.log.debug('Sending queryFullStatus command:', dataOut.toString('hex'));
    this.sock.write(dataOut);
};

// Query ID
/* Resonse format not supported yet: "Lync6" or "Lync12" w/o header or checksum
HTDLync.prototype.queryID = function() {
    var packet = new Buffer([0x02, 0x00, 0x00, 0x08, 0x00]);
    var dataOut = addChecksum(packet);
    this.log.debug('Sending queryID command:', dataOut.toString('hex'));
    this.sock.write(dataOut);
};
*/

// Query name of zone
HTDLync.prototype.queryZoneName = function(zone) {
    var packet = new Buffer([0x02, 0x00, 0x01, 0x0D, 0x00]);
    packet.writeUInt8(this.cleanZone(zone), 2);
    var dataOut = addChecksum(packet);
    this.log.debug('Sending queryZoneName command:', dataOut.toString('hex'));
    this.sock.write(dataOut);
};

// Query names of all zones
HTDLync.prototype.queryAllZoneNames = function() {
    for (var zone=1; zone<=12; zone++){
        this.queryZoneName(zone);
    }
};

// Query name of source for a zone
HTDLync.prototype.querySourceName = function(zone, source) {
    var packet = new Buffer([0x02, 0x00, 0x01, 0x0E, 0x00]);
    packet.writeUInt8(this.cleanZone(zone), 2);
    packet.writeUInt8(this.cleanSource(source)-1, 4); // Note off-by-one error in protcol
    var dataOut = addChecksum(packet);
    this.log.debug('Sending querySourceName command:', dataOut.toString('hex'));
    this.sock.write(dataOut);
};

// Query names of all sources for all zones
HTDLync.prototype.queryAllSourceNames = function() {
    
    // This command is currently buggy (responses are dropped)
    this.log.warn('Use of queryAllZoneNames is currently buggy, do not use it');
    
    for (var zone=1; zone<=12; zone++){
        for (var src=1; src<=18; src++){
            this.querySourceName(zone, src);
        }
    }
};


// Change echo mode ('On', 'Off', '1', or '0')
// When off, responses will not be sent by the device
HTDLync.prototype.setEchoMode = function(echo) {
    
    echoStr = echo.toString().toLowerCase();
    
    var packet = new Buffer([0x02, 0x00, 0x00, 0x19, 0x1F]);

    if (echoStr == 'on' || echoStr == '1'){
        packet.writeUInt8(0xFF, 4);
    }
    else if (echoStr == 'off' || echoStr == '0'){
        packet.writeUInt8(0x00, 4);
    }
    else {
        this.log.warn('Unknown setEcho argument:', echo);
        return;
    }
    
    var dataOut = addChecksum(packet);
    this.log.debug('Sending setEchoMode command:', dataOut.toString('hex'));
    this.sock.write(dataOut);
};

// Returns true if checksum is valid
HTDLync.prototype.validChecksum = function(data) {
    if ( !Buffer.isBuffer(data) ) {
        return false;
    }

    var actual = data[data.length-1];
    var calculated = calcChecksum(data.slice(0, data.length-1));
    return (actual == calculated);
};


// Validate zone
HTDLync.prototype.cleanZone = function(zone) {
    
    var clean = parseInt(zone.toString(), 10);
    
    if (!isNaN(clean) && clean >= 0 && clean <= 12) {
        return clean;
    } else {
        this.log.warn('Out of bounds zone', zone, 'was clipped to 0');
        return 0;
    }
}

// Validate source
HTDLync.prototype.cleanSource = function(source) {
    
    var clean = parseInt(source.toString(), 10);
    
    if (clean <= 0 || isNaN(clean)) {
        this.log.warn('Out of bounds source', source, 'was clipped to 1');
        return 1;
    } else if (clean > 18) {
        this.log.warn('Out of bounds source', source, 'was clipped to 18');
        return 18;
    } else {
        return clean;
    }
}


// Calculate the checksum of a Buffer
function calcChecksum(data) {
    
    if ( !Buffer.isBuffer(data) ) {
        return 0;
    }
    
    var checksum = 0;

    for (var ii = 0; ii < data.length; ii++) {
        checksum += data[ii];
        checksum &= 0x0FF;
    }
    
    return checksum;
}

// Add checksum byte to end of Buffer
function addChecksum(data) {

    if ( !Buffer.isBuffer(data) ) {
        return 0;
    }
    
    checksum = calcChecksum(data);
    
    var buf = new Buffer(data.length + 1);
    data.copy(buf);
    buf.writeUInt8(checksum, buf.length-1);
    
    return buf;
};

module.exports = HTDLync;