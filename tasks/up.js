var spawn = require('child_process').spawn;

module.exports = function() {
    'use strict';

    var pack = this.query();

    return pack.fetch()
        .then(function() {
            return pack.profile.up(pack);
        });
};