var http = require('http'),
    path = require('path'),
    fs = require('fs'),
    fsmonitor = require('fsmonitor');

module.exports = function() {
    'use strict';

    var reporter = this.reporter;

    reporter.print('log', 'Serving www resources');

    var manifest = this.require('manifest')();
    if (manifest.cordova && manifest.cordova.serve) {
        var serve = manifest.cordova.serve;
        var server = http.createServer(function(req, res) {
            console.log(req.method, req.url);

            var platform = 'ios';
            if (req.headers['user-agent'].match(/android/i)) {
                platform = 'android';
            }

            var uri = req.url,
                prefixPath = path.join('./platforms', platform,'assets/www'),
                filePath = path.join(prefixPath, uri);

            if (!fs.existsSync(filePath) || fs.lstatSync(filePath).isDirectory()) {
                filePath = path.join(filePath, 'index.html');
            }

            if (!fs.existsSync(filePath) || fs.lstatSync(filePath).isDirectory()) {
                console.log(req.method, req.url, 'Not found');
                res.writeHead(404);
                res.end('Not found');
                return;
            }

            var content = fs.readFileSync(filePath);
            res.write(content);
            res.end();
        });

        server.listen(serve.port, serve.host, function() {
            reporter.print('log', 'Listening on %s:%s', serve.host, serve.port);
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