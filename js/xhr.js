/**
 * Simple native async XHR.
 */
define(function () {

    'use strict';

    return function (url, callback, errback) {

        var xhr = new XMLHttpRequest();

        xhr.open('GET', url, true);

        xhr.onreadystatechange = function () {
            var status;
            if (xhr.readyState === 4) {
                status = xhr.status;
                if (status >= 400 && status < 600) {
                    //if you don't care about handling the error, we'll just swallow it.
                    if (errback) {
                        errback(new Error("Problem loading [" + url + "] status: [" + status + "]"));
                    }
                } else {
                    callback(xhr.responseText);
                }
            }
        };

        xhr.send(null);

    };

});