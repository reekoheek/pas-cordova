var path = require('path');

module.exports = {
    providers: [
        path.join(__dirname, '../providers/cordova.js')
    ],
    profiles: [
        path.join(__dirname, '../profiles/cordova.js')
    ],
};