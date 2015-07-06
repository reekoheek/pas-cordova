var http = require('http'),
    path = require('path'),
    fs = require('fs'),
    os = require('os'),
    fsmonitor = require('fsmonitor'),
    mime = require('mime');

module.exports = function() {
    'use strict';

    var pack = this.query();

    return pack.fetch()
        .then(function() {
            this.i('cordova', 'Serving www resources');

            return pack.profile.cordovaServe(pack);
        }.bind(this));
};