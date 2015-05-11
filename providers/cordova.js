module.exports = {
    support: function(uri) {
        'use strict';

        if (uri.match(/^cordova:/)) {
            return true;
        }
    },

    normalizeUrl: function(uri) {
        'use strict';

        return uri;
    },

    fetchIndices: function() {
        'use strict';

        return Promise.resolve({
            devs: {
                master: {
                    name: 'master',
                    type: 'dev'
                }
            }
        });
    },

    pull: function() {
        'use strict';

        // noop

        return Promise.resolve();
    }
};