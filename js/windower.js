/**
 * This AMD plugin acts like a seed file coordinating multiple windows opened from a parent.
 * This can be used for (a) postMessage calls, and (b) shared data storage using a private hash on the parent.
 * See the very bottom for the public functions that are exposed by the plugin.
 *
 * The intent is to wrap up postMessage functionality behind a simple wrapper that deals with window listeners, etc.
 * Also, the data setting/getting is done via postMessage as well, in order to ensure "clean" transfer.
 * This means the data must be serializable. Part of the wrapper's activity then is to "hide" the data get/set
 * messages from normal message traffic. Of course, if you setup your own event listeners you can inspect those "private"
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
 * TODO: this only allows exact origin matches. it might be nice to allow config to be supplied that expands the origin matching.
 */
define(function () {

    'use strict';

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
                    return "window-" + (++id);
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
            window.addEventListener("unload", function () {
                topmost.windowerFunctions.removeChild(this);
            });

        } else {

            //if we're the parent, we want to re-broadcast the messages (unless they are our "private" data transfer messages)
            window.addEventListener("message", function (e) {

                var type = e.data._type,
                    key = e.data.key,
                    getter = e.data._getter,
                    data, msg;

                if (e.origin === window.location.origin) {

                    if (type === "data-set-request") {

                        data = e.data.data;
                        topmost.windowerFunctions.setData(key, data);

                    } else if (type === "data-get-request") {

                        data = topmost.windowerFunctions.getData(key);
                        msg = {
                            key: key,
                            data: data,
                            _type: "data-get-response",
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
            window.addEventListener("unload", function () {
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
         * Unwraps event data from "message" event to simplify passing of messages.
         * Does not listen on messages from the same window.
         * NOTE: only one listener is allowed at a time, which should be reasonable with this API.
         * It would be difficult otherwise to manage unregistering the events.
         * @param callback
         */
        listen: function (callback) {

            if (listener) {
                throw new Error(window.windowerName + " already has a listener - please use windower.unlisten() first");
            }

            listener = function (e) {
                if (e.origin === window.location.origin && !e.data._type && (window.windowerName !== e.data._sender)) {
                    callback.call(window, e.data.message);
                }
            };

            window.addEventListener("message", listener);

        },

        /**
         * Unregisters listening on the "message" events with a given callback.
         * According to the postMessage spec, you must pass the same function that you registered with.
         * Since we kept a copy of it (in the "listener" wrapper), all you need to do is call this method.
         */
        unlisten: function () {
            if (listener) {
                window.removeEventListener("message", listener);
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
                _type: "data-set-request",
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
                    if (e.data._type === "data-get-response" && e.data.key === key) {
                        window.removeEventListener("message", handler); //only want this once.
                        callback(e.data.data);
                    }
                }
            };

            window.addEventListener("message", handler);

            topmost.postMessageProxy({
                key: key,
                _type: "data-get-request",
                _getter: window.windowerName
            });

        }

    };
});
