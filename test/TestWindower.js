define([
    'plugins/windower'
], function (
    windower
) {

    'use strict';

    var win;

    //helper to open a window by name without having to re-type the path
    function openWindow(name) {
        win = window.open('/base/test/html/' + name + '.html', name);
    }


    describe('windower', function () {

        afterEach(function () {
            if (win) {
                win.close();
            }
            windower.unlisten(); //TODO: use native methods to unlisten, so we aren't relying on the thing we're testing
        });

        describe('one-way messaging', function () {

            it('new window sends message back to parent', function (done) {

                windower.listen(function (msg) {
                    assert.equal('hi', msg.title);
                    done();
                });

                openWindow('extended-window-basic');

            });

        });


        describe('two-way messaging', function () {

            it('parent window gets message from child, then sends message back', function (done) {

                //listen for loaded message that child will send
                //it will either send a 'loaded' flag, or a 'looped' flag
                //'loaded' means it has started up successfully
                //'looped' means it received a message from the parent and is sending it back
                windower.listen(function (msg) {

                    if (msg.loaded) {
                        //when child is loaded, send a message back to it
                        windower.send({'loopback': true});
                    } else {
                        assert.isTrue(msg.looped);
                        done();
                    }

                });

                openWindow('extended-window-loopback');

            });

        });

        //these next two use the messaging system as loading alerts to trigger events
        //unfortunately, that conflates the testing of messaging and data storage
        //we should probably use native browser eventing to monitor the loading
        describe('using the shared data store', function () {

            it('get data that extended window placed in store', function (done) {

                //the extended window will publish a message when it is loaded, so this allows us to wait until it is ready
                windower.listen(function (msg) {

                    if (msg.loaded) {
                        windower.get('test-data', function (data) {
                            assert.equal(12, data.value);
                            done();
                        });
                    }

                });

                openWindow('extended-window-set-ext');

            });

            it('get data that main window placed in store', function (done) {

                windower.listen(function (msg) {

                    //if it is just the loading event, set some data and tell the ext to go to the next step
                    //otherwise, this is the ext telling us it is done, so we want to assert the value that it sent back
                    if (msg.loaded) {
                        windower.set('test-data-2', {'value': 27});
                        windower.send({'op': 'get it'}); //tell the extended window to check the data value and send it back
                    } else {
                        assert.equal(27, msg.value);
                        done();
                    }

                });

                openWindow('extended-window-set-main');

            });

        });

        describe('listener registration', function () {

            it('trying to listen more than once fails', function () {

                windower.listen(function () {});

                assert.throws(function () {
                    windower.listen(function () {});
                }, 'window-1 already has a listener - please use windower.unlisten() first');

            });

            it('unlisten method removes handler, so we can listen again', function () {

                windower.listen(function () {});

                //once we unlisten, we can listen again
                windower.unlisten();

                assert.doesNotThrow(function () {
                    windower.listen(function () {});
                });

            });

        });

    });

});
