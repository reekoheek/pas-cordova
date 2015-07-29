/**
 *
 * Copyright (c) 2015 Xinix Technology
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 */

var spawn = require('child_process').spawn,
    fs = require('fs'),
    path = require('path'),
    xml2js = require('xml2js'),
    fsmonitor = require('fsmonitor'),
    os = require('os'),
    mime = require('mime');

module.exports = {
    support: function(pack) {
        'use strict';

        if (fs.existsSync(path.join(pack.cachePath, 'config.xml'))) {
            return true;
        }

        if (pack.queryUrl.match(/\/providers\/cordova\//)) {
            return true;
        }
    },

    read: function(pack) {
        'use strict';

        return this.super_.read.apply(this, arguments)
            .then(function(manifest) {
                manifest = manifest || {};

                return new Promise(function(resolve, reject) {
                    fs.readFile(path.join(pack.cachePath, 'config.xml'), function(err, configXml) {
                        if (err) {
                            return reject(err);
                        }

                        xml2js.parseString(configXml, function (err, result) {
                            if (err) {
                                return reject(err);
                            }

                            manifest.name = manifest.name || 'cordova/' + result.widget.$.id.split('.').pop();
                            manifest.version = manifest.version || result.widget.$.version;
                            manifest.description = manifest.description || result.widget.description;
                            manifest.dependencies = manifest.dependencies || {};

                            manifest.cordova = manifest.cordova || {};
                            if (this.env === 'development') {
                                manifest.cordova.serve = manifest.cordova.serve || true;
                            }
                            manifest.cordova.widget = result.widget;

                            resolve(manifest);
                        }.bind(this));
                    }.bind(this));
                }.bind(this));
            }.bind(this));
    },

    install: function(pack) {
        var platforms = ['android'];
        if (pack.cordova && pack.cordova.platforms) {
            platforms = pack.cordova.platforms.slice(0);
        }

        var promises = [];

        platforms.forEach(function(platform) {
            if (!fs.existsSync(path.join(pack.cachePath, 'platforms', platform))) {

                promises.push(new Promise(function(resolve, reject) {
                    this.i('cordova', 'Add platform %s', platform);

                    var exe = spawn('cordova', ['platform', 'add', platform], {stdio: 'inherit'});

                    exe.on('exit', function(exitCode) {
                        if (exitCode === 0) {
                            resolve();
                        } else {
                            reject(new Error('Exit with code: ' + exitCode));
                        }
                    });
                }.bind(this)));
            }
        }.bind(this));

        return Promise.all(promises)
            .then(function() {
                return new Promise(function(resolve, reject) {

                    var dependencies = pack.dependencies;

                    var promise = Promise.resolve();

                    Object.keys(dependencies).forEach(function(i) {
                        var dependency = i.split('cordova:').slice(1).join('cordova:');
                        if (!dependency) {
                            throw new Error('Invalid dependency "' + i + '"');
                        }

                        if (fs.existsSync(path.join(pack.cachePath, 'plugins', dependency))) {
                            this.i('cordova', 'Plugin %s already installed', dependency);
                        } else {
                            promise = promise.then(function() {
                                var addPlugin = spawn('cordova', ['plugin', 'add', dependency], {stdio: 'inherit'});

                                return new Promise(function(resolve, reject) {
                                    addPlugin.on('close', function(statusCode) {
                                        if (statusCode === 0) {
                                            resolve();
                                        } else {
                                            reject(new Error('Exit with error: ' + statusCode));
                                        }
                                    });
                                });
                            });
                        }
                    }.bind(this));

                    resolve(promise);
                }.bind(this));
            }.bind(this));
    },

    up: function(pack, options) {
        'use strict';

        options = options || {};

        return this.cordovaConfigure(pack)
            .then(function() {
                return this.cordovaServe(pack);
            }.bind(this))
            .then(function() {
                return new Promise(function(resolve, reject) {
                    this.i('cordova', 'Running mobile app');
                    var args = ['run'];

                    if (options.platform) {
                        args.push(options.platform);
                    }

                    var exe = spawn('cordova', args, {'stdio': 'inherit'});

                    exe.on('exit', function(exitCode) {
                        if (exitCode === 0) {
                            resolve();
                        } else {
                            reject(new Error('Exit with code: ' + exitCode));
                        }
                    });
                }.bind(this));
            }.bind(this));
    },

    cordovaConfigure: function(pack) {
        'use strict';

        if (pack.cordova.serve) {
            var host = pack.cordova.host,
                port = pack.cordova.port || 3000;

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

            return saveConfigXML(pack, {
                name: pack.cordova.name || pack.cordova.widget.name || 'Cordova App',
                content: [{
                    '$': {
                        src: 'http://' + host + ':' + port + '/'
                    }
                }]
            });

        } else {
            return saveConfigXML(pack, {
                name: pack.cordova.name || pack.cordova.widget.name || 'Cordova App',
                content: [{
                    '$': {
                        src: pack.cordova.content || 'index.html'
                    }
                }]
            });
        }
    },

    cordovaServe: function(pack) {
        'use strict';

        if(!pack.cordova.serve) {
            return;
        }

        var port = pack.cordova.port || 3000;

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

        var browserSync = require('browser-sync').create();
        browserSync.init({
            online: false,
            xip: false,
            reloadOnRestart: true,
            notify: false,
            open: false,
            port: port,
            server: {
                baseDir: ['./www'],
                middleware: function(req, res, next) {
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
                                    reject(new Error('IS_DIR'));
                                } else {
                                    resolve(filePath);
                                }
                            });
                        });
                    };

                    checkFile(filePath)
                        .then(function() {}, function(e) {
                            if (e.message !== 'IS_DIR') {
                                throw e;
                            }
                            filePath = path.join(filePath, 'index.html');
                            return checkFile(filePath);
                        }).then(function() {
                            console.log('OK', req.method, req.url);
                            var mtype = mime.lookup(filePath);
                            res.writeHead(200, {
                                'Content-Type': mtype
                            });
                            fs.createReadStream(filePath).pipe(res);
                        }, function(e) {
                            console.log('NX', e.message);
                            next();
                        });
                }
            }
        }, function(err, bs) {
            if (err) {
                throw err;
            }
            this.i('cordova', 'Start watching ...');
        }.bind(this));

        var watchedDir = './www';
        var monitor = fsmonitor.watch(watchedDir, {
            // include files
            matches: function(relpath) {
                return true;
            },
            // exclude directories
            excludes: function(relpath) {
                return relpath.match(/^\.git$/i) !== null;
            }
        });
        monitor.on('change', function(changes) {

            var promises = [],
                changedMap = {};

            var onChange = function(file, platform) {
                promises.push(new Promise(function(resolve, reject) {
                    var from = path.join(watchedDir, file),
                        to = path.join('./platforms', platform, 'assets/www', file),
                        toStream = fs.createWriteStream(to);
                    toStream.on('close', function() {
                        changedMap[file] = file;
                        resolve();
                    });
                    fs.createReadStream(from).pipe(toStream);
                }));
            };

            changes.addedFiles.forEach(function(file) {
                console.log('- [A]', file);
                platforms.forEach(function(platform) {
                    onChange(file, platform);
                });
            });

            changes.modifiedFiles.forEach(function(file) {
                console.log('- [M]', file);
                platforms.forEach(function(platform) {
                    onChange(file, platform);
                });
            });

            Promise.all(promises).then(function() {
                browserSync.reload(Object.keys(changedMap));
            });
        });
    },

    release: function(pack, platform) {
        'use strict';

        platform = platform || 'android';

        return new Promise(function(resolve, reject) {
            switch(platform) {
                case 'android':
                    var keyPassword = pack.cordova.keyPassword || '',
                        storePassword = pack.cordova.storePassword || '';

                    var propFile = path.join('platforms/android/release-signing.properties');
                    var keyStorePath = path.join(process.env.HOME, '.keystores', pack.name, platform || 'android') + '.keystore';
                    var fileContent = 'storeFile=' + keyStorePath + '\n';
                    fileContent += 'storeType=\n';
                    fileContent += 'keyAlias=playkeystore\n';
                    fileContent += 'keyPassword=' + keyPassword + '\n';
                    fileContent += 'storePassword=' + storePassword + '\n';

                    fs.writeFileSync(propFile, fileContent);

                    var executable = path.resolve('platforms/android/gradlew');
                    var releaseBuild = spawn(executable, ['assembleRelease'], {stdio:'inherit', cwd: path.resolve('platforms/android')});

                    releaseBuild.on('exit', function(statusCode) {
                        if (statusCode === 0) {
                            this.i('cordova', 'Built and signed apk at %s', path.resolve('platforms/android/build/outputs/apk/android-release.apk'));
                            resolve();
                        } else {
                            reject(new Error('Error with status code: ' + statusCode));
                        }
                    }.bind(this));

                    break;
                default:
                    throw new Error('Unimplented release for platform: ' + platform);
            }
        }.bind(this));
    },

    generateKeyStore: function(pack, platform) {
        'use strict';

        return new Promise(function(resolve, reject) {
            var fsUtil = this.require('util/fs');
            var keyStorePath = path.join(process.env.HOME, '.keystores', pack.name, platform || 'android') + '.keystore';

            if (fs.existsSync(keyStorePath)) {
                return reject(new Error('Keystore already exists at: ' + keyStorePath));
            }

            fsUtil.mkdirp(path.dirname(keyStorePath));
            var args = [
                '-genkey',
                '-v',
                '-keystore',
                keyStorePath,
                '-alias',
                'playkeystore',
                '-keyalg',
                'RSA',
                '-keysize',
                '2048',
                '-validity',
                '20000'
            ];
            this.i('cordova', 'Generating keystore on %s', keyStorePath);
            var gen = spawn('keytool', args, {stdio:'inherit'});
            gen.on('exit', function(statusCode) {
                if (statusCode === 0) {
                    resolve();
                } else {
                    reject(new Error('Error with status code: ' + statusCode));
                }
            });
        }.bind(this));
    }
};

var saveConfigXML = function(pack, options) {
    'use strict';

    options = options || {};

    var configFile = path.join(pack.cachePath, 'config.xml');

    return new Promise(function(resolve, reject) {
            fs.readFile(configFile, function(err, configXml) {
                if (err) {
                    return reject(err);
                }

                xml2js.parseString(configXml, function (err, result) {
                    if (err) {
                        return reject(err);
                    }
                    resolve(result);
                });
            });
        })
        .then(function(xmlObject) {
            for(var i in options) {
                xmlObject.widget[i] = options[i];
            }

            var builder = new xml2js.Builder({
                xmldec: {
                    encoding: 'utf-8',
                    standalone: null
                }
            });
            return builder.buildObject(xmlObject);
        })
        .then(function(xml) {
            fs.writeFileSync(configFile, xml);
        });
};
