module.exports = 
{
    
    setPower: function (sock, zone, power) {
        
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
        
        return sock.write(addChecksum(packet));
    },
    
    setSource: function (sock, zone, source) {
        
        var sourceNum = parseInt(source.toString(), 10);
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
        
        return sock.write(addChecksum(packet));
    },

    setVolume: function (sock, zone, vol) {
        
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
        
        return sock.write(addChecksum(packet));
    },
    
    queryAllStatus: function (sock) {
        
        var packet = new Buffer([0x02, 0x00, 0x00, 0x5, 0x00]);
        
        return sock.write(addChecksum(packet));
    },
    
    // Returns true if checksum is valid
    validChecksum: function (data) {
        if ( !Buffer.isBuffer(data) ) {
            return false;
        }
    
        var actual = data[data.length-1];
        var calculated = calcChecksum(data.slice(0, data.length-1));
        
        return (actual == calculated);
    }
};


// Validate zone
var cleanZone = function (zone) {
    
    var cleanZone = parseInt(zone.toString(), 10);
    
    if (zone >= 0 || zone <= 12) {
        return cleanZone;
    } else {
        return 0;
    }
}


// Calculate the checksum of a Buffer
var calcChecksum = function (data) {
    
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
var addChecksum = function (data) {

    if ( !Buffer.isBuffer(data) ) {
        return 0;
    }

    checksum = calcChecksum(data);
    
    var buf = new Buffer(data.length + 1);
    data.copy(buf);
    buf.writeUInt8(checksum, buf.length-1);
    
    return buf;
};