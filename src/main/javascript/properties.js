/**
 * A properties-file reader plugin for requirejs. This plugin reads files in the standard Java properties key=value
 * form and passes them through as a JSON object for JavaScript use.
 *
 * Doesn't support all the variants of the .properties format yet, but handles comments and some spaces fine.
 * See http://en.wikipedia.org/wiki/.properties
 *
 * Depends on jburke's text plugin: https://github.com/requirejs/text
 */
define([
    "./text"
], function (text) {

    var plugin = {

        /**
         * RequireJs API method for loading a module.
         * @param {string} name - name of module to load. Will be pre-normalized by AMD.
         * @param {function} parentRequire - require function with local scope for loading modules synchronously.
         * @param {function} onload - callback function to invoke with this plugin's output
         * @param {object} config - config object for the plugin. NOTE this is not supported by dojo/bdload.
         */
        load: function (name, parentRequire, onload, config) {

            text.get(parentRequire.toUrl(name),
                function (props) {

                    var json = {};

                    if (props && props.length > 0) {

                        //just iterate the lines in the file's string content, pulling apart the name-value pairs
                        props.split("\n").forEach(function (line) {

                            line = line.trim();

                            //avoid leading comment characters
                            if (line.indexOf("#") !== 0 && line.indexOf("!") !== 0) {

                                var tuple = line.split("="),
                                    name = tuple[0].trim(),
                                    value = tuple[1].trim();

                                json[name] = value;

                            }
                        });

                    }

                    onload(json);

                },
                function (err) {
                    throw new Error(err); //text plugin assumes an err callback, we'll just throw so the message can be seen
                });

        }

    };

    return plugin;

});