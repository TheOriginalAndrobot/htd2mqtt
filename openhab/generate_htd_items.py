#!/usr/bin/python

# Map of Zone, Name, Group(s)
mapping = [(1,"Master Bed","Master"),
           (2,"Master Bath","MasterBath"),
           (3,"Guest Bed","Guest"),
           (4,"Lab","Lab"),
           (5,"Turret","Turret"),
           (6,"Kitchen","Kitchen"),
           (7,"Office","Office"),
           (8,"Sun Room","Sun"),
           (9,"Back Patio","Outside"),
           (10,"Dining Room","Dining"),
           (11,"Garage","Garage"),
           (12,"Living Room","Living")]


# Global items           
print "Switch Audio_Zone_All_Power \"Whole House Audio Power\" (Audio) {mqtt=\">[msq:swalt/htd/set/0/power:command:OFF:default]\"}"
print "Switch Audio_Zone_All_Mute \"Whole House Audio Mute\" (Audio) {mqtt=\">[msq:swalt/htd/set/0/mute:command:*:default]\"}"
print "Number Audio_Bridge_Connection_Status \"Audio Bridge Connection Status [%d]\" (Audio) {mqtt=\"<[msq:swalt/htd/connected:state:default]\"}"
print "String Audio_Bridge_Update \"Audio Bridge Update Request [%s]\" (Audio) {mqtt=\">[msq:swalt/htd/set/0/update:command:*:default]\"}"
print ""

# Per zone items
for (num, name, room) in mapping:

    item = "Audio_Zone_%d" % (num)
    name = name + " Audio"

    print "Switch %s_Power \"%s Power\" (Audio,%s) {mqtt=\">[msq:swalt/htd/set/%s/power:command:*:default], <[msq:swalt/htd/status/%s/power:state:default]\"}" % (item,name,room,num,num)
    print "Switch %s_Mute \"%s Mute\" (Audio,%s) {mqtt=\">[msq:swalt/htd/set/%s/mute:command:*:default], <[msq:swalt/htd/status/%s/mute:state:default]\"}" % (item,name,room,num,num)
    print "Number %s_Volume \"%s Volume [%%d]\" (Audio,%s) {mqtt=\">[msq:swalt/htd/set/%s/volume:command:*:default], <[msq:swalt/htd/status/%s/volume:state:default]\"}" % (item,name,room,num,num)
    print "Dimmer %s_Volume_Percent \"%s Volume [%%d %%%%]\" (Audio,%s) {mqtt=\">[msq:swalt/htd/set/%s/volumepercent:command:*:default], <[msq:swalt/htd/status/%s/volumepercent:state:default]\"}" % (item,name,room,num,num)
    print "Number %s_Source \"%s Source [%%d]\" (Audio,%s) {mqtt=\">[msq:swalt/htd/set/%s/source:command:*:default], <[msq:swalt/htd/status/%s/source:state:default]\"}" % (item,name,room,num,num)
    
    print "Switch %s_DND \"%s DND\" (Audio) {mqtt=\">[msq:swalt/htd/set/%s/dnd:command:*:default], <[msq:swalt/htd/status/%s/dnd:state:default]\"}" % (item,name,num,num)
    
    print "String %s_Zone_Name \"%s Zone Name [%%s]\" (Audio) {mqtt=\"<[msq:swalt/htd/status/%s/name:state:default]\"}" % (item,name,num)
    print "Contact %s_Zone_Exists \"%s Zone Exists [MAP(contact_to_truefalse.map):%%s]\" (Audio) {mqtt=\"<[msq:swalt/htd/status/%s/exists:state:MAP(onezero_to_contact.map)]\"}" % (item,name,num)
    print "Contact %s_Keypad_Present \"%s Keypad Present [MAP(contact_to_truefalse.map):%%s]\" (Audio) {mqtt=\"<[msq:swalt/htd/status/%s/keypadpresent:state:MAP(onezero_to_contact.map)]\"}" % (item,name,num)
    
    print ""

print ""
