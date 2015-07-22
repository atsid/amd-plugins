require([
    "plugins/windower"
], function (
    windower
) {

    'use strict';

    var win;

    /**
     * These test methods utilize html/extended-window-*.html to perform cross-window communication.
     * There is a little bit of message/callback management here to make sure we're capturing the right things
     * and allowing the async test to proceed properly.
     * Each test method has some corresponding action in the extended window, which is documented there.
     */
    AsyncTestCase("TestWindower", {

        setUp: function () {
            jstestdriver.plugins.async.CallbackPool.TIMEOUT = 2000;
        },

        tearDown: function () {
            if (win) {
                win.close();
            }
            windower.unlisten(); //TODO: use native methods to unlisten, so we aren't relying on the thing we're testing
        },

        //helper to open a window by name without having to re-type the path
        openWindow: function (name) {
            win = window.open("/test/src/test/javascript/html/" + name + ".html", name);
        },

        //sets up a message event, then executes a function that presumably will cause it to resolve
        addMessageEventAndWait: function (queue, waitOperation) {
            queue.call(function (callbacks) {
                var callback = callbacks.add(function (e) {
                    jstestdriver.console.log("got waiting message " + JSON.stringify(e.data));
                    window.removeEventListener(callback);
                });
                window.addEventListener("message", callback);
            });
            waitOperation.call(this);
        },

        //helper to open a window and wait for a "message" event before allowing the test to proceed
        openWindowAndWait: function (name, queue) {

            this.addMessageEventAndWait(queue, function () {
                this.openWindow(name);
            });

        },

        //helper to add a callback and then listen on it with the windower
        addListenerWithCallback: function (callbacks, handler, count) {

            var callback = callbacks.add(handler, count || 1);

            windower.listen(callback);
        },

        //the extended window is going to send a message when it loads.
        //this will test that the message comes through the windower registration mechanisms properly.
        testBasicMessaging: function (queue) {

            var title = null;

            queue.call(function (callbacks) {

                this.addListenerWithCallback(callbacks, function (msg) {
                    jstestdriver.console.log("got basic message: " + JSON.stringify(msg));
                    title = msg.title;
                });

                this.openWindow("extended-window-basic");

            });

            queue.call(function () {
                assertEquals("hi", title);
            });

        },

        //this confirms that the loopback structure we have within the extended window works properly, verifying two-way communication
        testLoopback: function (queue) {

            var looped = false;

            this.openWindowAndWait("extended-window-loopback", queue);

            queue.call(function (callbacks) {

                this.addListenerWithCallback(callbacks, function (msg) {
                    jstestdriver.console.log("got loopback message in loopback test: " + JSON.stringify(msg));
                    looped = msg.looped;
                });

                windower.send({"loopback": true});

            });


            queue.call(function () {
                assertTrue(looped);
            });

        },


        //test setting data in the extended window, and then retrieving it in the main window
        testDataSetByExtendedAndGetByMain: function (queue) {

            var dataValue;

            this.openWindowAndWait("extended-window-set-ext", queue);

            queue.call(function (callbacks) {

                var callback = callbacks.add(function (data) {
                    jstestdriver.console.log("got data " + JSON.stringify(data));
                    dataValue = data.value;
                });

                windower.get("test-data", callback);

            });

            queue.call(function () {
                assertEquals(12, dataValue);
            });

        },

        //test the opposite - setting in the main window, then getting in the extended
        testDataSetByMainAndGetByExtended: function (queue) {

            var dataValue;

            this.addMessageEventAndWait(queue, function () {
                windower.set("test-data-2", {"value": 27});
            });

            this.openWindowAndWait("extended-window-set-main", queue);


            queue.call(function (callbacks) {

                this.addListenerWithCallback(callbacks, function (msg) {
                    jstestdriver.console.log("got data message from extended window: " + JSON.stringify(msg));
                    dataValue = msg.value;
                });

                windower.send({"op": "get it"});

            });

            queue.call(function () {
                assertEquals(27, dataValue);
            });

        },

        testUnlisten: function () {

            windower.listen(function () {});

            try {
                windower.listen(function () {});
                assertTrue(false);
            } catch (e) {
                jstestdriver.console.log("Got expected multiple-listeners error");
                assertTrue(true);
            }

            //once we unlisten, we can listen again
            windower.unlisten();
            windower.listen(function () {});

        }


    });

});
