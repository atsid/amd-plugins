/**
 * This is a little different way to test - what we're going to do is simply use the plugin and validate properties
 * on the modules that are loaded, essentially letting requirejs do its part and validating we've done ours.
 */
define([
    'plugins/properties!test/fake.properties'
], function (
    props
) {

    'use strict';

    describe('properties', function () {

        it('basic properties are parsed and mapped correctly into json', function () {
            assert.equal("hi", props.name);
        });

        it('dot-delimited properties are parsed and mapped correctly into json', function () {
            assert.equal("1.2.3", props["dot.delimited"]);
        });

        it('properties with spaces are parsed and mapped correctly into json', function () {
            assert.equal("ok", props["with.spaces"]);
        });

    });

});
