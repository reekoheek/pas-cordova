var fs = require('fs'),
    os = require('os');

var get = function(manifest, key) {
    'use strict';

    if (manifest.cordova && manifest.cordova.vars && manifest.cordova.vars[key]) {
        return manifest.cordova.vars[key];
    }

    if (key !== 'name') {
        return manifest[key];
    }
};

var ConfigXML = function(task, filename) {
    'use strict';

    this.reporter = task.reporter;

    this.filename = filename || './config.xml';

    this.originalContent = this.content = fs.readFileSync(this.filename, 'utf8');
};

ConfigXML.prototype.set = function(key, value) {
    'use strict';

    this.reporter.print('log', 'set %s=%s', key, value);
    switch(key) {
        case 'name':
            this.content = this.content.replace(/<name>[^<]*<\/name>/, '<name>' + value + '</name>');
            break;
        case 'content':
            this.content = this.content.replace(/<content\s+src="[^"]*"\s*\/>/, '<content src="' + value + '" />');
            break;
        case 'id':
            this.content = this.content.replace(/<widget id="[^"]*"/, '<widget id="' + value + '"');
            break;
        default:
            throw new Error('Unimplemented yet for ' + key);
    }
};

ConfigXML.prototype.save = function() {
    'use strict';

    if (this.originalContent === this.content) {
        return;
    }
    fs.writeFileSync(this.filename, this.content);
};


module.exports = function() {
    'use strict';

    var manifest = this.require('manifest')(),
        configXml = new ConfigXML(this, './config.xml');

    this.reporter.print('log', 'Configuring cordova app');

    var content = get(manifest, 'content');
    if (!content) {
        var host = get(manifest, 'host'),
            port = get(manifest, 'port') || 3000;

        if (!host) {
            var ifaces = os.networkInterfaces();
            var iface;
            Object.keys(ifaces).some(function(key) {
                return ifaces[key].some(function(i) {
                    if (i.family === 'IPv4' && i.internal === false) {
                        iface = i.address;
                        return true;
                    }
                });
            });
            host = iface;
        }
        content = 'http://' + host + ':' + port;
    }

    configXml.set('name', get(manifest, 'name'));
    configXml.set('content', content);
    configXml.save();
};