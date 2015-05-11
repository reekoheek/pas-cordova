var http = require('http'),
    path = require('path'),
    fs = require('fs'),
    os = require('os'),
    fsmonitor = require('fsmonitor'),
    mime = require('mime');

var get = function(manifest, key) {
    'use strict';

    if (manifest.cordova && manifest.cordova.vars && manifest.cordova.vars[key]) {
        return manifest.cordova.vars[key];
    }

    if (key !== 'name') {
        return manifest[key];
    }
};

module.exports = function() {
    'use strict';

    var reporter = this.reporter;

    reporter.print('log', 'Serving www resources');

    var manifest = this.require('manifest')();
    if (get(manifest, 'serve')) {
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

        var server = http.createServer(function(req, res) {
            var platform = 'ios';
            if (req.headers['user-agent'].match(/android/i)) {
                platform = 'android';
            }

            var uri = req.url,
                prefixPath = path.join('./platforms', platform,'assets/www'),
                filePath = path.join(prefixPath, uri);

            var checkFile = function(filePath) {
                return new Promise(function(resolve, reject) {
                    fs.lstat(filePath, function(err, stat) {
                        if (err) {
                            return reject(err);
                        }

                        if (stat.isDirectory()) {
                            reject(new Error('Not file'));
                        } else {
                            resolve(filePath);
                        }
                    });
                });
            };

            checkFile(filePath)
                .then(function() {}, function() {
                    filePath = path.join(filePath, 'index.html');
                    return checkFile(filePath);
                }).then(function() {
                    console.log('OK', req.method, req.url);
                    var mtype = mime.lookup(filePath);
                    res.writeHead(200, {
                        'Content-Type': mtype
                    });
                    fs.createReadStream(filePath).pipe(res);
                }, function() {
                    console.log('NF', req.method, req.url);
                    res.writeHead(404);
                    res.end('Not found');
                });
        });

        server.listen(port, host, function() {
            reporter.print('log', 'Listening on %s:%s', host, port);
        });

        reporter.print('log', 'Start watching ...');

        var platformMap,
            platforms,
            platformsJson = path.join('./platforms/platforms.json');

        if (fs.existsSync(platformsJson)) {
            platformMap = JSON.parse(fs.readFileSync(platformsJson));
            platforms = Object.keys(platformMap);
        } else {
            platforms = [];
            var files = fs.readdirSync('./platforms');
            files.forEach(function(file) {
                if (fs.lstatSync(path.join('./platforms', file)).isDirectory()) {
                    platforms.push(file);
                }
            });
        }

        var watchedDir = './www';
        var monitor = fsmonitor.watch(watchedDir, {
            // include files
            matches: function(relpath) {
                return true;
                // return relpath.match(/\.js$/i) ||
                //     relpath.match(/\.html$/i) ||
                //     relpath.match(/\.css$/i);
            },
            // exclude directories
            excludes: function(relpath) {
                return relpath.match(/^\.git$/i) !== null;
            }
        });
        monitor.on('change', function(changes) {
            // { addedFiles: [],
            //   modifiedFiles: [ 'index.html' ],
            //   removedFiles: [],
            //   addedFolders: [],
            //   modifiedFolders: [],
            //   removedFolders: [] }

            changes.addedFiles.forEach(function(file) {
                console.log('- [A]', file);
                platforms.forEach(function(platform) {
                    var from = path.join(watchedDir, file),
                        to = path.join('./platforms', platform, 'assets/www', file);
                    fs.createReadStream(from).pipe(fs.createWriteStream(to));
                });
            });

            changes.modifiedFiles.forEach(function(file) {
                console.log('- [M]', file);
                platforms.forEach(function(platform) {
                    var from = path.join(watchedDir, file),
                        to = path.join('./platforms', platform, 'assets/www', file);
                    fs.createReadStream(from).pipe(fs.createWriteStream(to));
                });
            });
        });
    }

};