/**
 * An Inversion-of-Control plugin for requirejs, allowing us to configure modules that should be initialized before being handed off.
 * Takes some inspiration from Spring and the JavaScript-like example from dojo: http://java.dzone.com/articles/inversion-control-container
 *
 * For requirejs plugin API, please see http://requirejs.org/docs/plugins.html#api
 *
 * Beans are defined as a JSON configuration object, indicating the class to load and optionally params to pass to the constructor.
 * If a bean has already been loaded, it will be cached and returned from then on (operating similarly to a spring bean).
 * Note that this only supports one 'application context' per window because it relies on built-in AMD module caching.
 * In addition, it is currently assumed that the module referenced is a constructor, and will be instantiated.
 *
 * The JSON config looks like so (with id/ref spring terminology):
 * {
 *     beans: {
 *         <id>: {
 *             type: <ref>,
 *             params: {}
 *         }
 *     }
 * }
 *
 * This config needs to be passed to the requirejs config.
 * Here's a simple example to load a logger module.
 * (see http://requirejs.org/docs/api.html#config)
 * requirejs.config({
 *     config: {
 *         'plugins/ioc': {
 *             'beans': {
 *                 'app/logging/Logger': {
 *                     'type': 'app/logging/Logger',
 *                     'params: { 'logLevel': 'DEBUG' }
 *                 },
 *                 'app/logging/HashTrackingLogger': {
 *                     'type': 'app/logging/HashTrackingLogger'
 *                     'params': { 'logger': 'ref:ioc!app/logging/Logger' }
 *                 }
 *             }
 *         }
 *     }
 * });
 *
 * Once loaded for the first time, the instance will be cached by the usual AMD loader mechanism.
 * Note the use of the module name as the bean ID - this allows us to specify 'interfaces' in a java-like manner if desired.
 * The type can then be a different class that implements the same methods, but is injected by the IOC container.
 * You can of course use whatever you'd like for the bean ID, this is just a convention we've found helpful given the dynamic nature of JavaScript.
 *
 * You may also want to use this plugin directly, invoking its load method. If you want to get point-of-use args instead
 * of the global config that requirejs will pass in, send a config object with a 'params' field containing the same params a bean config would:
 * load(name, require, callback, {
 *     params: {
 *         'logLevel: 'DEBUG'
 *     }
 * });
 *
 * A global bean config must still exist for the bean that declares its type! This mechanism just allows for runtime customization of the ctor params
 * when using the ioc plugin directly.
 *
 * Special parameter processing:
 * String parameters starting with 'ref:' are treated specially by this plugin. The remainder of the string following 'ref:' is assumed to be an
 * AMD module path (which could include the use of plugins like ioc!) and is loaded as a module, the return value of which is passed in place of
 * the string as the parameters value.
 */
define('plugins/ioc',[
    'module'
], function (
    module
) {

    

    var conf = module.config(),
        beans = conf ? conf.beans : {},
        plugin = {

            /**
             * RequireJs API method for loading a module.
             * @param {string} name - name of module to load. Will be pre-normalized by AMD.
             * @param {function} parentRequire - require function with local scope for loading modules synchronously.
             * @param {function} onload - callback function to invoke with this plugin's output
             * @param {object} config - config object for the plugin. The intent of the IOC plugin is to create object instances,
             *          so config sent in here is assumed to be constructor args for the module, attached to a 'params' field.
             *          NOTE this is not supported by dojo/bdload, but can be used when invoking ioc.load directly, such as by other plugins.
             */
            load: function (name, parentRequire, onload, config) {

                var bean = beans[name],
                    modules,
                    keys = [],
                    params = config && config.params;

                if (bean) {

                    //local bean config wins, otherwise use global
                    params = params || bean.params;

                    //collect modules, including embedded refs.
                    modules = [bean.type];
                    Object.keys(params || {}).forEach(function (key) {
                        var parts = params[key].toString().split('ref:');
                        if (parts.length > 1) {
                            modules.push(parts[1]);
                            keys.push(key);
                        }
                    });

                    parentRequire(modules, function () {
                        var instance, args = arguments;
                        keys.forEach(function (key, idx) {
                            params[key] = args[idx + 1];
                        });
                        instance = new arguments[0](params);
                        onload(instance);
                    });

                } else {
                    throw new Error('IOC bean [' + name + '] requested, but no config found.');
                }

            }

        };

    return plugin;

});

/**
 * Simple native async XHR.
 */
define('plugins/xhr',[],function () {

    

    return function (url, callback, errback) {

        var xhr = new XMLHttpRequest();

        xhr.open('GET', url, true);

        xhr.onreadystatechange = function () {
            var status;
            if (xhr.readyState === 4) {
                status = xhr.status;
                if (status >= 400 && status < 600) {
                    //if you don't care about handling the error, we'll just swallow it.
                    if (errback) {
                        errback(new Error('Problem loading [' + url + '] status: [' + status + ']'));
                    }
                } else {
                    callback(xhr.responseText);
                }
            }
        };

        xhr.send(null);

    };

});
/**
 * AMD plugin that loads JSON Schema files.
 * See http://tools.ietf.org/html/draft-zyp-json-schema-03.
 *
 * It also resolves $refs within the schema, executing additional requests until
 * the schema is fully resolved. The additional requests are self-executing using local require,
 * to take advantage of AMD caching of each file.
 *
 * This plugin works like so:
 * 1) Get a schema using ajax, from the configured location (such as a directory service, or file system)
 * 2) Recursively examine that schema for all $ref fields that point to a different schema
 * 3) Construct a list of 'dependencies' from the $ref fields, and issue a parentRequire using this very same plugin
 * 4) Replace the $ref values with full objects once they are retrieved from the parentRequire
 *
 * In this manner, it will descend the schema graph until all are retrieved and attached to the original entry point schema.
 * Conveniently, every parentRequire for a child schema results in caching so the next schema will be constructed more quickly.
 *
 * An optional name formatter for the schema IDs (module names) can be supplied, in order to provide a configurable mechanism for
 * preparing IDs for ajax request, such as by prepending with a server name. A default formatter that leaves
 * the ID unmodified is supplied, to account for IDs that resolve properly already, or the use of other aliasing mechanisms.
 *
 * An optional fetch function can be used to override the built-in native XHR fetch, for either backwards compatibility with legacy browsers, or synchronous loading.
 *
 * An optional errorHandler for fetch errors can be supplied as well in the config.
 *
 * LIMITATION: the plugin does not yet attempt any extra id resolution from the jsonschema spec, such as '#'.
 *
 */
define('plugins/jsonschema',[
    './xhr',
    'module'
], function (
    xhr,
    module
) {

    

    function defaultFormatter(name) {
        return name;
    }

    var config = module.config() || {},
        formatter = config.formatter || defaultFormatter,
        fetch = config.fetch || xhr,
        errorHandler = config.errorHandler,
        plugin;

    function getSchema(name, parentRequire, callback) {

        //recursively find all of the $ref items in an object and compile them into a map so there won't be any duplicates
        function findRefs(schema) {

            function walk(obj, refs) {

                Object.keys(obj).forEach(function (key) {

                    var value = obj[key];

                    if (key === '$ref' && !refs[value]) {
                        refs[value] = true; //using an object so we skip dups
                    } else if (typeof value === 'object') {
                        walk(value, refs);
                    }

                });

                return refs;

            }

            return walk(schema, {});

        }

        //given a list of schema objects, find one with an id that matches the specified id
        function findSchema(id, schemas) {
            var result;
            schemas.some(function (schema) {
                if (schema.id === id) {
                    result = schema;
                    return true;
                }
            });
            return result;
        }

        //resolve an initial schema retrieved via ajax, delegating to this same plugin for child dependencies in a batch
        function resolve(schema, parentRequire, callback) {

            var refs = findRefs(schema, {}),
                refNames = [];

            //make a list of names from the map of ids found in ref search
            Object.keys(refs).forEach(function (ref) {
                if (ref !== name) {
                    refNames.push(module.id + '!' + ref);
                }
            });

            if (refNames.length > 0) {

                parentRequire(refNames, function () {

                    var schemas = Array.prototype.slice.call(arguments);
                    //make sure to include the current schema in case of recursion - we didn't want to ajax this again
                    schemas.push(schema);

                    //we've got a set of schema objects, now we need to replace the $ref from the parent with them
                    schema = placeRefs(schema, schemas);

                    callback(schema);
                });

            } else {
                callback(schema);
            }


        }

        //recursively descend an object, replacing all $ref values with the retrieved schemas
        function placeRefs(schema, refObjects) {

            function walk(obj, refObjects) {

                Object.keys(obj).forEach(function (key) {

                    var value = obj[key],
                        subschema;

                    if (key === '$ref') {
                        subschema = findSchema(value, refObjects);
                        obj = subschema;
                        if (!obj.resolved) {
                            obj.resolved = true; //don't do it again
                            obj = walk(obj, refObjects);
                        }
                    } else if (typeof value === 'object') {
                        if (!value.resolved) {
                            value.resolved = true; //don't do it again
                            value = walk(value, refObjects);
                        }
                        obj[key] = value;
                    }

                });

                return obj;
            }

            return walk(schema, refObjects);
        }


        var formattedName = formatter(name);

        fetch(parentRequire.toUrl(formattedName), function (schemaText) {
            //TODO: would it be easier to find all the $ref values with a regex match here before parsing JSON?
            var json = JSON.parse(schemaText);
            resolve(json, parentRequire, callback);
        }, errorHandler);

    }

    plugin = {

        load: function (name, parentRequire, onload) {

            getSchema(name, parentRequire, onload);

        }
    };

    return plugin;

});
/**
 * A properties-file reader plugin for requirejs. This plugin reads files in the standard Java properties key=value
 * form and passes them through as a JSON object for JavaScript use.
 *
 * Doesn't support all the variants of the .properties format yet, but handles comments and some spaces fine.
 * See http://en.wikipedia.org/wiki/.properties
 *
 * A basic async xhr function is used by default, but can be overridden by providing your own 'fetch' function in the module config.
 *
 * An optional errorHandler for fetch errors can be supplied as well in the config.
 *
 */
define('plugins/properties',[
    './xhr',
    'module'
], function (
    xhr,
    module
) {

    

    var config = module.config() || {},
        fetch = config.fetch || xhr,
        errorHandler = config.errorHandler,
        plugin = {

        /**
         * RequireJs API method for loading a module.
         * @param {string} name - name of module to load. Will be pre-normalized by AMD.
         * @param {function} parentRequire - require function with local scope for loading modules synchronously.
         * @param {function} onload - callback function to invoke with this plugin's output
         * @param {object} config - config object for the plugin. NOTE this is not supported by dojo/bdload.
         */
        load: function (name, parentRequire, onload) {

            fetch(parentRequire.toUrl(name),
                function (props) {

                    var json = {};

                    if (props && props.length > 0) {

                        //just iterate the lines in the file's string content, pulling apart the name-value pairs
                        props.split('\n').forEach(function (line) {

                            line = line.trim();

                            //avoid leading comment characters
                            if (line.indexOf('#') !== 0 && line.indexOf('!') !== 0) {

                                var tuple = line.split('='),
                                    name = tuple[0].trim(),
                                    value = tuple[1].trim();

                                json[name] = value;

                            }
                        });

                    }

                    onload(json);

                },
                errorHandler);

        }

    };

    return plugin;

});
/**
 * This AMD plugin acts like a seed file coordinating multiple windows opened from a parent.
 * This can be used for (a) postMessage calls, and (b) shared data storage using a private hash on the parent.
 * See the very bottom for the public functions that are exposed by the plugin.
 *
 * The intent is to wrap up postMessage functionality behind a simple wrapper that deals with window listeners, etc.
 * Also, the data setting/getting is done via postMessage as well, in order to ensure 'clean' transfer.
 * This means the data must be serializable. Part of the wrapper's activity then is to 'hide' the data get/set
 * messages from normal message traffic. Of course, if you setup your own event listeners you can inspect those 'private'
 * messages, but the intent isn't to keep the data secret, merely to provide a clean API for shared data storage.
 *
 * At the very least an array of children must be maintained on the parent, so postMessage can be delegated properly.
 * Some browsers only allow postMessage to the parent, not to others in the child array. Therefore we'll delegate everything through topmost.
 * See: http://blogs.msdn.com/b/thebeebs/archive/2011/12/21/postmessage-popups-and-ie.aspx
 *
 * Note that this automatically registers each window as a child, and hooks dom events to unregister on close.
 * Children also self-register instead of topmost keeping a handle from window.open, because not all browsers return the child window instance.
 * The topmost window will automatically close all children if it is unloaded, in order to guarantee synchronized state.
 * Because children automatically register and unregister, they can be refreshed and will reconnect to the message bus.
 *
 * TODO: this only allows exact origin matches. it might be nice to allow config to be supplied that expands the origin matching. (filed as issue #3)
 */
define('plugins/windower',[],function () {

    

    function getFirstOpener(win) {
        if (win.opener) {
            //prevent infinite recursion on page refresh
            if (window.windowerName === win.opener.windowerName) {
                return win;
            }
            return getFirstOpener(win.opener);
        } else {
            return win;
        }
    }


    //these functions will be added to the parent window to wrap private shared objects
    var parentFunctions = function () {

            var children = {},
                id = 0,
                dataStore = {};

            return {
                addChild: function (child) {
                    children[child.windowerName] = child;
                },
                removeChild: function (child) {
                    delete children[child.windowerName];
                },
                iterateChildren: function (callback) {
                    Object.keys(children).forEach(function (key) {
                        callback.call(this, children[key]);
                    });
                },
                getNewWindowName: function () {
                    return 'window-' + (++id);
                },
                getData: function (key) {
                    return dataStore[key];
                },
                setData: function (key, data) {
                    dataStore[key] = data;
                }
            };

        },

        topmost = getFirstOpener(window),
        listener = null;

    if (!topmost.windowerFunctions) {
        topmost.windowerFunctions = parentFunctions();
    }

    //whatever window this is, we're going to register it. either we're a child or a parent, and need to be accounted for as such
    //children get added to an array of children for message delegation
    //the parent gets a special event listener just for message propagation
    (function () {

        //ensure that every window that loads this has a unique name for messaging
        window.windowerName = topmost.windowerFunctions.getNewWindowName();

        window.postMessageProxy = function (data) {
            window.postMessage(data, window.location.origin);
        };

        if (window.windowerName !== topmost.windowerName) {

            //we aren't the parent, so add as a child
            topmost.windowerFunctions.addChild(window);

            //if a child window gets refreshed, make sure to unhook it, or else it'll end up with duplicate messages later
            window.addEventListener('unload', function () {
                topmost.windowerFunctions.removeChild(this);
            });

        } else {

            //if we're the parent, we want to re-broadcast the messages (unless they are our 'private' data transfer messages)
            window.addEventListener('message', function (e) {

                var type = e.data._type,
                    key = e.data.key,
                    getter = e.data._getter,
                    data, msg;

                if (e.origin === window.location.origin) {

                    if (type === 'data-set-request') {

                        data = e.data.data;
                        topmost.windowerFunctions.setData(key, data);

                    } else if (type === 'data-get-request') {

                        data = topmost.windowerFunctions.getData(key);
                        msg = {
                            key: key,
                            data: data,
                            _type: 'data-get-response',
                            _getter: getter
                        };

                        if (getter === window.windowerName) {
                            window.postMessageProxy(msg); //possibly data sending to self (maybe this should bypass postMessage?)
                        } else {
                            topmost.windowerFunctions.iterateChildren(function (child) {
                                if (getter === child.windowerName) {
                                    child.postMessageProxy(msg);
                                }
                            });
                        }

                    } else {

                        topmost.windowerFunctions.iterateChildren(function (child) {
                            child.postMessageProxy(e.data);
                        });

                    }

                }

            }, false);

            //and close all children when we close, because topmost is the master
            window.addEventListener('unload', function () {
                topmost.windowerFunctions.iterateChildren(function (child) {
                    child.close();
                });
            });

        }

    }());

    return {

        /**
         * Sends a message to any window in the collection managed by a topmost parent (except the sender).
         */
        send: function (message) {
            topmost.postMessageProxy({
                _sender: window.windowerName,
                message: message
            });
        },

        /**
         * Sets up window event listening to get sent messages from other windows.
         * Unwraps event data from 'message' event to simplify passing of messages.
         * Does not listen on messages from the same window.
         * NOTE: only one listener is allowed at a time, which should be reasonable with this API.
         * It would be difficult otherwise to manage unregistering the events.
         * @param callback
         */
        listen: function (callback) {

            if (listener) {
                throw new Error(window.windowerName + ' already has a listener - please use windower.unlisten() first');
            }

            listener = function (e) {
                if (e.origin === window.location.origin && !e.data._type && (window.windowerName !== e.data._sender)) {
                    callback.call(window, e.data.message);
                }
            };

            window.addEventListener('message', listener);

        },

        /**
         * Unregisters listening on the 'message' events with a given callback.
         * According to the postMessage spec, you must pass the same function that you registered with.
         * Since we kept a copy of it (in the 'listener' wrapper), all you need to do is call this method.
         */
        unlisten: function () {
            if (listener) {
                window.removeEventListener('message', listener);
                listener = null;
            }
        },

        /**
         * Sets a data object in shared store, using a key.
         * Sets using postMessage so there is no shared context.
         * @param key
         * @param data
         */
        set: function (key, data) {
            topmost.postMessageProxy({
                key: key,
                data: data,
                _type: 'data-set-request',
                _setter: window.windowerName
            });
        },

        /**
         * Gets a data object by key from the shared store. Data is passed to callback when retrieved.
         * The callback is used because we're going to pass it through postMessage asynchronously.
         * @param key
         * @param callback
         */
        get: function (key, callback) {

            var handler = function (e) {
                if (e.origin === window.location.origin) {
                    if (e.data._type === 'data-get-response' && e.data.key === key) {
                        window.removeEventListener('message', handler); //only want this once.
                        callback(e.data.data);
                    }
                }
            };

            window.addEventListener('message', handler);

            topmost.postMessageProxy({
                key: key,
                _type: 'data-get-request',
                _getter: window.windowerName
            });

        }

    };
});

