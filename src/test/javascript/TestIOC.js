/**
 * This is a little different way to test - what we're going to do is simply use the plugin and validate properties
 * on the modules that are loaded, essentially letting requirejs do its part and validating we've done ours.
 */
require([
    "test/FakeModule",
    "plugins/ioc!test/FakeModule"
], function (
    FakeModuleConstructor,
    fakeModuleInstance
) {

    TestCase("TestIOC", {

        //if we request the module without the plugin, it is just a constructor function
        testFakeModuleConstructor: function () {
            var instance = new FakeModuleConstructor({name: "goodbye"});
            assertEquals("goodbye", instance.name);
        },

        //if we request it with the plugin, it is an instance with args passed from
        //the beans defined for the plugin in config.js
        testFakeModuleInstance: function () {
            assertEquals("hello", fakeModuleInstance.name);
        }

    });

});