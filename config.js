var pkg = require('./package.json');
var config = require('yargs')
    .usage(pkg.name + ' ' + pkg.version + '\n' + pkg.description + '\n\nUsage: $0 [options]')
    .describe('v', 'possible values: "error", "warn", "info", "debug"')
    .describe('n', 'instance name. used as mqtt client id and as prefix for connected topic')
    .describe('u', 'mqtt broker url. See https://github.com/mqttjs/MQTT.js#connect-using-a-url')
    .describe('b', 'TCP serial bridge host')
    .describe('p', 'TCP serial bridge port')
    .describe('h', 'show help')
    .alias({
        'h': 'help',
        'v': 'verbosity',
        'n': 'name',
        'u': 'url',
        'b': 'tcpserial-host',
        'p': 'tcpserial-port'
    })
    .default({
        'v': 'info',
        'n': 'htd',
        'u': 'mqtt://127.0.0.1',
        'b': '127.0.0.1',
        'p': 2001
    })
    .version(pkg.name + ' ' + pkg.version + '\n', 'version')
    .help('help')
    .argv;

module.exports = config;