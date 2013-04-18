/**
 * This test treats ioc as a normal module with methods that can be exercised, unlike the other test that sets it up completely
 * like a plugin in actual use.
 */
require([
    "plugins/ioc",
    "test/FakeModule" //requiring the actual here so we don't need to async test
], function (
    ioc,
    fakeModule
) {

    var mockRequire = function (deps, callback) {
        callback(fakeModule);
    };

    TestCase("TestIOCMethods", {

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
                name: "gotcha"
            });

        }

    });

});
