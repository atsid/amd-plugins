'use strict';

var allTestFiles = [],
    pathToModule = function (path) {
        var fixed = path.replace(/^\/base\//, '').replace(/\.js$/, '');
        return fixed;
    };

Object.keys(window.__karma__.files).forEach(function (file) {
    if (/Test.*\.js$/.test(file)) {
        // Normalize paths to RequireJS module names.
        allTestFiles.push(pathToModule(file));
    }
});

window.AsyncTestCase = function () {};

require.config({
    // Karma serves files from '/base'
    baseUrl: '/base',
    paths: {
        plugins: 'js',
        test: 'test'
    },

    // ask Require.js to load these files (all our tests)
    deps: allTestFiles,

    // start test run, once Require.js is done
    callback: window.__karma__.start,

    //below is config for the plugins that we're going to test out
    config: {
        'plugins/ioc': {
            'beans': {
                'fakemodule1': {
                    'type': 'test/FakeModule',
                    'params': {
                        'name': 'hello'
                    }
                },
                //no params on this one, as we're going to pass them into load() directly
                'fakemodule2': {
                    'type': 'test/FakeModule'
                },
                //params reference another bean.
                'fakemodule3': {
                    'type': 'test/FakeModule',
                    'params': {
                        'title': 'replaced title',
                        'name': 'ref:plugins/ioc!fakemodule1'
                    }
                }
            }
        },
        'plugins/jsonschema': {
            formatter: function (name) {
                return 'test/schema/' + name + '.json';
            }
        }
    }
});