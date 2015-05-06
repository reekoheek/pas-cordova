var path = require('path');

// FIXME pas install <MODULE_URI> not working yet
module.exports = {
    providerDirectories: [
        path.join(__dirname, '../providers/cordova.js')
    ],
    profileDirectories: [
        path.join(__dirname, '../profiles/cordova.js')
    ],
};