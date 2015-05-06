var spawn = require('child_process').spawn;

module.exports = function() {
    'use strict';

    var task = this.require('task'),
        reporter = this.reporter;

    return task.run('cordova:configure', this.opts).then(function() {
        return task.run('cordova:serve', this.opts);
    }.bind(this)).then(function() {
        return new Promise(function(resolve, reject) {

            reporter.print('log', 'Running mobile app');

            var exe = spawn('cordova', ['run'], {'stdio': 'inherit'});

            exe.on('exit', function() {
                resolve();
            });
        });
    });
};