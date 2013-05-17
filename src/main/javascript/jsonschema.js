/**
 * AMD plugin that loads JSON Schema files (using text plugin).
 * See http://tools.ietf.org/html/draft-zyp-json-schema-03.
 *
 * It also resolves $refs within the schema, executing additional requests until
 * the schema is fully resolved. The additional requests are self-executing using local require,
 * to take advantage of AMD caching of each file.
 *
 * This plugin works like so:
 * 1) Get a schema using ajax, from the configured location (such as a directory service, or file system)
 * 2) Recursively examine that schema for all $ref fields that point to a different schema
 * 3) Construct a list of "dependencies" from the $ref fields, and issue a parentRequire using this very same plugin
 * 4) Replace the $ref values with full objects once they are retrieved from the parentRequire
 *
 * In this manner, it will descend the schema graph until all are retrieved and attached to the original entry point schema.
 * Conveniently, every parentRequire for a child schema results in caching so the next schema will be constructed more quickly.
 *
 * An optional name formatter for the schema IDs (module names) can be supplied, in order to provide a configurable mechanism for
 * preparing IDs for ajax request, such as by prepending with a server name. A default formatter that leaves
 * the ID unmodified is supplied, to account for IDs that resolve properly already, or the use of other aliasing mechanisms.
 *
 * A "sync" config option allows you to force this plugin to use a synchronous XHR instead of the requirejs text plugin.
 * This is useful for projects that have synchronous dependency issues (e.g., those that are transitioning with dojo).
 *
 * LIMITATION: the plugin does not yet attempt any extra id resolution from the jsonschema spec, such as "#".
 *
 */
define([
    "./text",
    "module"
], function (
    text,
    module
) {

    var defaultFormatter = function (name) {
            return name;
        },
        config = module.config(),
        formatter = config ? (config.formatter || defaultFormatter) : defaultFormatter,
        sync = config.sync,
        plugin;

    function getSchema(name, parentRequire, callback) {

        //recursively find all of the $ref items in an object and compile them into a map so there won't be any duplicates
        function findRefs(schema) {

            function walk(obj, refs) {

                Object.keys(obj).forEach(function (key) {

                    var value = obj[key];

                    if (key === "$ref" && value !== name) {
                        refs[value] = true; //using an object so we skip dups
                    } else if (typeof value === "object") {
                        walk(value, refs);
                    }

                });

                return refs;

            }

            return walk(schema, {});

        }

        //given a list of schema objects, find one with an id that matches the specified id
        function findSchema(id, schemas) {
            var result;
            schemas.some(function (schema) {
                if (schema.id === id) {
                    result = schema;
                    return true;
                }
            });
            return result;
        }

        //recursively descend an object, replacing all $ref values with the retrieved schemas
        function placeRefs(schema, refObjects) {

            function walk(obj, refObjects) {

                Object.keys(obj).forEach(function (key) {

                    var value = obj[key],
                        subschema;

                    if (key === "$ref") {
                        subschema = findSchema(value, refObjects);
                        obj = subschema;
                        //resolve this one now if needed
                        if (!obj.resolved) {
                            obj.resolved = true; //don't do it again
                            obj = walk(obj, refObjects);
                        }
                    } else if (typeof value === "object") {
                        value = walk(value, refObjects);
                        obj[key] = value;
                    }

                });

                return obj;
            }

            return walk(schema, refObjects);
        }

        //resolve an initial schema retrieved via ajax, delegating to this same plugin for child dependencies in a batch
        function resolve(schema, parentRequire, callback) {

            var refs = findRefs(schema, {}),
                refNames = [];

            //make a list of names from the map of ids found in ref search
            Object.keys(refs).forEach(function (ref) {
                refNames.push(module.id + "!" + ref);
            });

            if (refNames.length > 0) {

                parentRequire(refNames, function () {

                    var schemas = Array.prototype.slice.call(arguments);
                    //we've got a set of schema objects, now we need to replace the $ref from the parent with them
                    schema = placeRefs(schema, schemas);

                    callback(schema);
                });

            } else {
                callback(schema);
            }


        }


        var formattedName = formatter(name),
            url = parentRequire.toUrl(formattedName),
            xhr,
            handler = function (schemaText) {
                var json = JSON.parse(schemaText);
                resolve(json, parentRequire, callback);
            };

        //use native XHR if sync is requested, or delegate to text plugin
        if (sync) {
            xhr = new XMLHttpRequest();
            xhr.open("GET", url, false);
            xhr.send();
            handler(xhr.responseText);
        } else {
            text.get(url,
                handler,
                function (err) {
                    throw new Error(err); //text plugin assumes an err callback, we'll just throw so the message can be seen
                });
        }


    }

    plugin = {

        load: function (name, parentRequire, onload, config) {

            getSchema(name, parentRequire, onload);

        }
    };

    return plugin;

});