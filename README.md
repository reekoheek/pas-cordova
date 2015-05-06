# pas-cordova

Pas Cordova Plugin


## Install

You have to install pas to use this plugin.

Installing pas and plugin

```
npm install -g pas
npm install -g pas-cordova
```

## Usage

Write pas.json file inside your cordova project

```json
{
    "name": "vendor/app",
    "version": "0.0.1",
    "description": "My Fabulous App",
    "profile": "cordova",
    "cordova": {
        "vars": {
            "id": "com.example.MyApp",
            "name": "My App",
            "content": "http://MY_IP:3000"
        },
        "serve": {
            "host": "MY_IP",
            "port": "3000"
        }
    },
    "dependencies": {
        "cordova:cordova-plugin-geolocation": "*",
        "cordova:org.apache.cordova.file": "*"
    }
}
```