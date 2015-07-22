/**
 * This is a little different way to test - what we're going to do is simply use the plugin and validate properties
 * on the modules that are loaded, essentially letting requirejs do its part and validating we've done ours.
 *
 * We'll also exercise the plugin directly.
 */
require([
    "plugins/ioc",
    "test/FakeModule",
    "plugins/ioc!fakemodule1",
    "plugins/ioc!fakemodule3"
], function (
    ioc,
    FakeModuleConstructor,
    fakeModuleInstance,
    refFakeModuleInstance
) {

    'use strict';

    //for the direct ioc.load invocation tests, we'll just pass back the already-loaded module so we don't have to write async tests
    var mockRequire = function (deps, callback) {
        callback(FakeModuleConstructor);
    };

    TestCase("TestIOC", {

        //if we request the module without the plugin, it is just a constructor function
        testFakeModuleConstructor: function () {
            var instance = new FakeModuleConstructor({name: "goodbye"});
            jstestdriver.console.log(JSON.stringify(instance));
            assertEquals("goodbye", instance.name);
            assertEquals("a fake module", instance.title);
        },

        //if we request it with the plugin, it is an instance with args passed from
        //the beans defined for the plugin in config.js
        testFakeModuleInstance: function () {
            jstestdriver.console.log(JSON.stringify(fakeModuleInstance));
            assertEquals("hello", fakeModuleInstance.name);
            assertEquals("a fake module", fakeModuleInstance.title);
        },

        //tests that the config param on the load function is passed as ctor args to the module being instantiated
        testLoadConfigUndefined: function () {

            ioc.load("fakemodule2", mockRequire, function (instance) {

                jstestdriver.console.log(JSON.stringify(instance));
                assertUndefined(instance.name);
                assertEquals("a fake module", instance.title);

            });

        },

        testLoadConfigExists: function () {

            ioc.load("fakemodule2", mockRequire, function (instance) {

                jstestdriver.console.log(JSON.stringify(instance));
                assertEquals("gotcha", instance.name);
                assertEquals("a fake module", instance.title);

            }, {
                "params": {
                    name: "gotcha"
                }
            });

        },

        testRefParameter: function () {
            assertNotUndefined(refFakeModuleInstance);
            jstestdriver.console.log(JSON.stringify(refFakeModuleInstance));
            assertEquals("hello", refFakeModuleInstance.name);
            assertEquals("replaced title", refFakeModuleInstance.title);
        },

        testLoadError: function () {

            try {
                ioc.load("fakemodule4");
                assertTrue(false);
            } catch (e) {
                assertEquals("Error: IOC bean [fakemodule4] requested, but no config found.", e);
                jstestdriver.console.log("Got expected error: " + e);
            }

        }

    });

});