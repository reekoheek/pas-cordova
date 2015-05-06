var fs = require('fs');

var get = function(manifest, key) {
    if (manifest.cordova && manifest.cordova.vars && manifest.cordova.vars[key]) {
        return manifest.cordova.vars[key];
    }

    if (key !== 'name') {
        return manifest[key] || 'unknown';
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

    configXml.set('name', get(manifest, 'name'));
    configXml.set('content', get(manifest, 'content'));
    configXml.save();
};