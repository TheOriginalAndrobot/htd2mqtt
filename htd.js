//
// HTD Lync device class
//

// Constructor, expects a socket/stream to write device commands into
function HTDLync(sock) {
    this.sock = sock;
};

// Change zone power state ('On', 'Off', '1', or '0')
HTDLync.prototype.setPower = function(zone, power) {
    
    powerStr = power.toString().toLowerCase();
    
    var packet = new Buffer([0x02, 0x00, 0x00, 0x04, 0x58]);
    packet.writeUInt8(cleanZone(zone), 2);

    if (powerStr == 'on' || powerStr == '1'){
        packet.writeUInt8(0x57, 4);
    }
    else if (powerStr == 'off' || powerStr == '0'){
        packet.writeUInt8(0x58, 4);
    }
    else {
        return null;
    }
    
    return this.sock.write(addChecksum(packet));
};

// Change zone mute state ('On', 'Off', '1', or '0')
HTDLync.prototype.setMute = function(zone, mute) {
    
    muteStr = mute.toString().toLowerCase();
    
    var packet = new Buffer([0x02, 0x00, 0x00, 0x04, 0x1F]);
    packet.writeUInt8(cleanZone(zone), 2);

    if (muteStr == 'on' || muteStr == '1'){
        packet.writeUInt8(0x1E, 4);
    }
    else if (muteStr == 'off' || muteStr == '0'){
        packet.writeUInt8(0x1F, 4);
    }
    else {
        return null;
    }
    
    return this.sock.write(addChecksum(packet));
};

// Change zone DND state ('On', 'Off', '1', or '0')
HTDLync.prototype.setDND = function(zone, dnd) {
    
    dndStr = dnd.toString().toLowerCase();
    
    var packet = new Buffer([0x02, 0x00, 0x00, 0x04, 0x5A]);
    packet.writeUInt8(cleanZone(zone), 2);

    if (dndStr == 'on' || dndStr == '1'){
        packet.writeUInt8(0x59, 4);
    }
    else if (dndStr == 'off' || dndStr == '0'){
        packet.writeUInt8(0x5A, 4);
    }
    else {
        return null;
    }
    
    return this.sock.write(addChecksum(packet));
};

// Set zone source by number (0-18)
HTDLync.prototype.setSource = function(zone, source) {
    
    var sourceNum = cleanSource(source);
    var sourceByte = 0x10;  // Input 1 by default
    
    if (sourceNum >= 1 && sourceNum <=12){
        sourceByte = 0x10 + (sourceNum - 1);
    }
    else if (sourceNum >= 13 && sourceNum <=18){
        sourceByte = 0x63 + (sourceNum - 13);
    }
    else {
        return null;
    }
    
    var packet = new Buffer([0x02, 0x00, 0x00, 0x04, 0x10]);
    packet.writeUInt8(cleanZone(zone), 2);
    packet.writeUInt8(sourceByte, 4);
    
    return this.sock.write(addChecksum(packet));
};

// Set zone volume (0-60)
HTDLync.prototype.setVolume = function(zone, vol) {
    
    var volNum = parseInt(vol.toString(), 10);
    
    if (volNum > 60){
        volNum = 60;
    }
    else if (volNum < 0){
        volNum = 0;
    }
    
    // For volume command, level 60 is 0x00, 59 is 0xFF, and 0 is 0xC4
    var volByte = volNum + 0x0C4;
    volByte = volByte & 0x0FF;
    
    var packet = new Buffer([0x02, 0x00, 0x00, 0x15, 0x43]);
    packet.writeUInt8(cleanZone(zone), 2);
    packet.writeUInt8(volByte, 4);
    
    return this.sock.write(addChecksum(packet));
};

// Status for all zones
HTDLync.prototype.queryZoneStatus = function() {
    var packet = new Buffer([0x02, 0x00, 0x00, 0x05, 0x00]);
    return this.sock.write(addChecksum(packet));
};

/* Query a lot of things...
    1. Echo All Zone Status.
    2. Echo All Zone Name.
    3. Echo All Source Name
    4. Echo MP3 On/Off
    5. Echo MP3 File Name and Artist Name
*/
/* Many responses to this command are broken, esp. #4 */
HTDLync.prototype.queryFullStatus = function() {
    var packet = new Buffer([0x02, 0x00, 0x01, 0x0C, 0x00]);
    return this.sock.write(addChecksum(packet));
};
/**/

// Query ID
/* Resonse format not supported yet: "Lync6" or "Lync12" w/o header or checksum
HTDLync.prototype.queryID = function() {
    var packet = new Buffer([0x02, 0x00, 0x00, 0x08, 0x00]);
    return this.sock.write(addChecksum(packet));
};
*/

// Query name of zone
HTDLync.prototype.queryZoneName = function(zone) {
    var packet = new Buffer([0x02, 0x00, 0x01, 0x0D, 0x00]);
    packet.writeUInt8(cleanZone(zone), 2);
    return this.sock.write(addChecksum(packet));
};

// Query name of source for a zone
// Note that responses to this command are busted (names get corrupted)
HTDLync.prototype.querySourceName = function(zone, source) {
    var packet = new Buffer([0x02, 0x00, 0x01, 0x0E, 0x00]);
    packet.writeUInt8(cleanZone(zone), 2);
    packet.writeUInt8(cleanSource(source)-1, 4);
    return this.sock.write(addChecksum(packet));
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
        return null;
    }
    
    return this.sock.write(addChecksum(packet));
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
function cleanZone(zone) {
    
    var cleanZone = parseInt(zone.toString(), 10);
    
    if (cleanZone >= 0 || cleanZone <= 12) {
        return cleanZone;
    } else {
        return 0;
    }
}

// Validate source
function cleanSource(source) {
    
    var cleanSource = parseInt(source.toString(), 10);
    
    if (cleanSource <= 0) {
        return 1;
    } else if (cleanSource > 18) {
        return 18;
    } else {
        return cleanSource;
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