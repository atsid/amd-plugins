/**
 * This is a little different way to test - what we're going to do is simply use the plugin and validate properties
 * on the modules that are loaded, essentially letting requirejs do its part and validating we've done ours.
 */
require([
    "plugins/properties!test/fake.properties"
], function (
    props
) {

    'use strict';

    TestCase("TestProperties", {

        //we expect the props variable from the plugin to be a simple JS map
        testPropertiesJSON: function () {
            jstestdriver.console.log(JSON.stringify(props));
            assertEquals("hi", props.name);
            assertEquals("1.2.3", props["dot.delimited"]);
            assertEquals("ok", props["with.spaces"]);
        }

    });

});
