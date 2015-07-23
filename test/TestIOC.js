/**
 * This is a little different way to test - what we're going to do is simply use the plugin and validate properties
 * on the modules that are loaded, essentially letting requirejs do its part and validating we've done ours.
 *
 * We'll also exercise the plugin directly.
 */
define([
    'plugins/ioc',
    'test/FakeModule',
    'plugins/ioc!fakemodule1',
    'plugins/ioc!fakemodule3'
], function (
    ioc,
    FakeModuleConstructor,
    fakeModuleInstance,
    refFakeModuleInstance
) {

    'use strict';

    describe('ioc', function () {

        it('requested module *without* the plugin is just a constructor function', function () {
            var instance = new FakeModuleConstructor({name: 'goodbye'});
            assert.equal('goodbye', instance.name);
            assert.equal('a fake module', instance.title);
        });
        
        it('module requested with plugin is an *instance* with args passed from the [beans] section of require.js config', function () {
            assert.equal('hello', fakeModuleInstance.name);
            assert.equal('a fake module', fakeModuleInstance.title);
        });

        describe('config param on the load function is passed as ctor args to the module being instantiated', function () {

            it('missing config leaves properties undefined', function (done) {

                ioc.load('fakemodule2', require, function (instance) {
                    assert.isUndefined(instance.name);
                    assert.equal('a fake module', instance.title);
                    done();
                });

            });

            it('existing config results in properties on the instance', function (done) {

                ioc.load('fakemodule2', require, function (instance) {
                    assert.equal('gotcha', instance.name);
                    assert.equal('a fake module', instance.title);
                    done();
                }, {
                    'params': {
                        name: 'gotcha'
                    }
                });

            });

        });

        it('*ref* prefix on bean name correctly injects referenced bean', function () {
            assert.isDefined(refFakeModuleInstance);
            assert.equal('hello', refFakeModuleInstance.name);
            assert.equal('replaced title', refFakeModuleInstance.title);
        });

        it('modules requested with no ioc config throw an error', function () {
            assert.throws(function () {
                ioc.load('fakemodule4');
            }, 'IOC bean [fakemodule4] requested, but no config found.');
        });

    });

});