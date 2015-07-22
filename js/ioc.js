/**
 * An Inversion-of-Control plugin for requirejs, allowing us to configure modules that should be initialized before being handed off.
 * Takes some inspiration from Spring and the JavaScript-like example from dojo: http://java.dzone.com/articles/inversion-control-container
 *
 * For requirejs plugin API, please see http://requirejs.org/docs/plugins.html#api
 *
 * Beans are defined as a JSON configuration object, indicating the class to load and optionally params to pass to the constructor.
 * If a bean has already been loaded, it will be cached and returned from then on (operating similarly to a spring bean).
 * Note that this only supports one "application context" per window because it relies on built-in AMD module caching.
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
 *         "plugins/ioc": {
 *             "beans": {
 *                 "app/logging/Logger": {
 *                     "type": "app/logging/Logger",
 *                     "params: { "logLevel": "DEBUG" }
 *                 },
 *                 "app/logging/HashTrackingLogger": {
 *                     "type": "app/logging/HashTrackingLogger"
 *                     "params": { "logger": "ref:ioc!app/logging/Logger" }
 *                 }
 *             }
 *         }
 *     }
 * });
 *
 * Once loaded for the first time, the instance will be cached by the usual AMD loader mechanism.
 * Note the use of the module name as the bean ID - this allows us to specify "interfaces" in a java-like manner if desired.
 * The type can then be a different class that implements the same methods, but is injected by the IOC container.
 * You can of course use whatever you'd like for the bean ID, this is just a convention we've found helpful given the dynamic nature of JavaScript.
 *
 * You may also want to use this plugin directly, invoking its load method. If you want to get point-of-use args instead
 * of the global config that requirejs will pass in, send a config object with a "params" field containing the same params a bean config would:
 * load(name, require, callback, {
 *     params: {
 *         "logLevel: "DEBUG"
 *     }
 * });
 *
 * A global bean config must still exist for the bean that declares its type! This mechanism just allows for runtime customization of the ctor params
 * when using the ioc plugin directly.
 *
 * Special parameter processing:
 * String parameters starting with "ref:" are treated specially by this plugin. The remainder of the string following "ref:" is assumed to be an
 * AMD module path (which could include the use of plugins like ioc!) and is loaded as a module, the return value of which is passed in place of
 * the string as the parameters value.
 */
define([
    "module"
], function (
    module
) {

    'use strict';

    var conf = module.config(),
        beans = conf ? conf.beans : {},
        plugin = {

            /**
             * RequireJs API method for loading a module.
             * @param {string} name - name of module to load. Will be pre-normalized by AMD.
             * @param {function} parentRequire - require function with local scope for loading modules synchronously.
             * @param {function} onload - callback function to invoke with this plugin's output
             * @param {object} config - config object for the plugin. The intent of the IOC plugin is to create object instances,
             *          so config sent in here is assumed to be constructor args for the module, attached to a "params" field.
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
                        var parts = params[key].toString().split("ref:");
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
                    throw new Error("IOC bean [" + name + "] requested, but no config found.");
                }

            }

        };

    return plugin;

});
