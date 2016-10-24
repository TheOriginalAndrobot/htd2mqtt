# htd2mqtt

[![License][mit-badge]][mit-url]
[![NPM version](https://badge.fury.io/js/htd2mqtt.svg)](http://badge.fury.io/js/htd2mqtt)
[![Dependency Status](https://img.shields.io/gemnasium/TheOriginalAndrobot/htd2mqtt.svg)](https://gemnasium.com/github.com/TheOriginalAndrobot/htd2mqtt)

This is an interface that allows control of an [HTD](www.htd.com) [Lync](http://www.htd.com/Products/Lync)
whole-house audio system via MQTT. It interfaces to the Lync unit via its serial
port (currently only over a TCP socket, not directly).


## Getting started

* Prerequisites
    * [Node.js](www.nodejs.org) >= 4.2.6 (including npm). 
    * Lync6 or Lync12 connected to a serial to ethernet (TCP socket) bridge

* Install:    
`sudo npm install -g htd2mqtt`


* Start:	
`htd2mqtt --help`
	* You will likely need to specify the TCP serial bridge's IP (`-b`) and port (`-p`)
	* You can also specify the MQTT topic prefix with `-t`, including slashes (e.g. `-t "home/htd"`).

* Example command line:  
`htd2mqtt -t "house/htd" -u "http://mqtt-server" -b "192.168.0.16" -p 2101`

## Topics and Payloads

### Status from device (read-only)

Topics take the form `htd/status/<zone>/<item>` where \<zone\> is the zone number (1-12)
and \<item\> is one of the below items.  
  
Note that updates/responses are not always sent by the device, such as when nothing has
changed as a result of a command (e.g. changing zones to the same zone).

#### \<zone\>/power
Power status of the zone, either `ON` or `OFF`.

#### \<zone\>/mute
Mute status of the zone, either `ON` (muted) or `OFF` (unmuted).

#### \<zone\>/dnd
DnD (Do Not Disturb) status of the zone, either `ON` or `OFF`.

#### \<zone\>/source
Current numeric source of the zone, from `1` through `18`.

#### \<zone\>/volume
Current numeric volume of the zone, from `0` (min) through `60` (max).

#### \<zone\>/volumepercent
Current percentage volume of the zone, from `0` (min) through `100` (max).

#### \<zone\>/exists
Whether the zone exists `1` or not `0`.

#### \<zone\>/keypadpresent
Whether the keypad is attached `1` or not `0`.

#### \<zone\>/mp3
Either `on`, `off`, or `end`. *These are currently untested.*

#### \<zone\>/name
Name of the zone, as a string.

#### \<zone\>/sourcename/\<source\>
Names of all the sources for this zone as a string, enumerated by \<source\> `1` through `18`. For example, `htd/2/sourcename/11` would report the name of source 11 on zone 2.


### Commands to device (write-only)

Topics take the form `htd/set/<zone>/<command>` where \<zone\> is the zone number from
`0` through `12` and \<command\> is one of the below commands. 
   
Note that a zone of `0` can often be used as a "broadcast" to send the same command to
all zones at once.

#### \<zone\>/power
Set power state of a zone (1-12) or all zones (0), either `On` or `Off` (case
insensitive).

#### \<zone\>/mute
Set mute state of a zone (1-12) or all zones (0), either `On` to mute or `Off` to unmute
(case insensitive).

#### \<zone\>/dnd
Set DnD state of a zone (1-12) or all zones (0), either `On` or `Off` (case
insensitive).

#### \<zone\>/source
Change the current numeric source of a zone (1-12) or all zones (0), from `1` through `18`.  
  
Note that sending this command to a zone that is off will turn it on.

#### \<zone\>/volume
Set the numeric volume of a zone (1-12), from `0` (min) through `60` (max). Using a zone
of 0 for changing all zones at once is not supported.

Note that strangeness occurs when setting the volume of a zone that is off. The keypad
will turn on and show only the volume digits, even though the zone remains off.

#### \<zone\>/volumepercent
Same as `volume`, except it accepts volume as a percentage from `0` (min) through `100` (max).


### Special-purpose topics

#### htd/connected
Read-only connection status of the program:
* `2` when both the serial port and MQTT are connected.  
* `1` when only MQTT is connected (i.e. serial port is not).  
* `0` when the program exits or MQTT disconnects. 

#### htd/set/0/update
Force a manual update of values using one of the following payloads:
* `status` Basic zone status for all zones, including power, mute, volume, source, etc.
* `zonenames` Reads all zone names.
* `sourcenames` Reads all source names on all zones. *Code is buggy, do not use!*
* `fullstatus` Full status of device, including zone and source names. *Firmware is buggy, not recommended.*
* `all` The "safe" way to query all device status at once. Currently does `status` and
`zonenames`. 


## Starting at boot

You can easily start this program on boot using systemd.  
  
First, as root, create `/usr/lib/systemd/system/htd2mqtt.service` with the following contents:

	[Unit]
	Description=Bridge from HTD Lync system to MQTT
	Wants=network-online.target
	After=network-online.target
	
	[Service]
	Type=simple
	ExecStart=/usr/local/bin/htd2mqtt -t "htd" -u "http://mqtt-server" -b "192.168.0.16" -p 2101
	Restart=always
	User=<user>
	Group=<group>
	
	# Give a reasonable amount of time for the server to start up/shut down
	TimeoutSec=300
	
	[Install]
	WantedBy=multi-user.target

**Note:** Be sure to edit the htd2mqtt command line args to match your setup as well as
change the User and Group to what the program should run as.

## License

MIT © [Andy Swing](https://github.com/TheOriginalAndrobot)

[mit-badge]: https://img.shields.io/badge/License-MIT-blue.svg?style=flat
[mit-url]: LICENSE