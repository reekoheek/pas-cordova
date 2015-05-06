var spawn = require('child_process').spawn;

module.exports = {
    support: function(baseDir) {
        'use strict';

        if (baseDir.match(/\/providers\/cordova\//)) {
            return true;
        }
    },

    preInstall: function(p) {
        'use strict';

        return true;
    },

    postInstall: function(p) {
        'use strict';


        return new Promise(function(resolve, reject) {
            var dependencies = p.readManifest().dependencies;

            var promise = Promise.resolve();

            Object.keys(dependencies).forEach(function(i) {
                var dependency = i.split('cordova:').slice(1).join('cordova:');
                if (!dependency) {
                    throw new Error('Invalid dependency "' + i + '"');
                }
                var addPlugin = spawn('cordova', ['plugin', 'add', dependency], {stdio: 'inherit'});

                promise = promise.then(function() {
                    return new Promise(function(resolve, reject) {
                        addPlugin.on('close', function() {
                            resolve();
                        });

                        addPlugin.on('error', function() {
                            console.log('err', arguments);
                        });
                    });
                });
            });

            resolve(promise);
        }.bind(this));
    }
};
