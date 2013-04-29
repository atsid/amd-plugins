amd-plugins
===========

A collection of handy plugins for AMD loaders.

## Overview
These plugins are things we've found useful in our development of large-scale web applications with complex dependencies and configuration.
When we converted our codebase to AMD as a module management method, we realized the plugin capability opened a number of
doors for application configuration, with the added bonus of built-in cache management by the loader.

## ioc.js
The IOC plugin allows for Spring-like injection of dependencies. The basic idea is that you define each of your JavaScript
modules as constructors (like classes), and then use Inversion-of-Control to get instances of them passed to other modules
that need them.

### ioc TODO
- Right now it only supports constructors that take a map of simple properties. We'd like to implement a "ref" mechanism for passing in other beans.

## jsonschema.js
The jsonschema plugin reads JSON Schema files (http://tools.ietf.org/html/draft-zyp-json-schema-03) and recursively resolves
any $ref properties to load an entire schema file including external schemas. It returns a live JavaScript object that can be used
by JSON Schema libraries such as validators or the other JSON Schema processors we've published (https://github.com/atsid/circuits-js,
https://github.com/atsid/schematic-js, https://github.com/atsid/bullhorn-js).

### jsonschema TODO
The plugin only does simple processing of the $ref values, and does not yet attempt to do full resolution of identifiers such
as self reference (#). However, a formatter function can be supplied that manipulates the schema name, so advanced processing
or transformation can be done if required.

## properties.js
The properties plugin loads Java-style name=value pair properties files and turns them in the JSON.

See http://en.wikipedia.org/wiki/.properties

## TODO
Need to move the require.js and text.js files into a lib directory so it is more clear that they are external dependencies.

## Compatibility
ECMA5 compatibility is assumed - if you need to use in a legacy browser, consider a shim.

##License
This software is licensed under the Apache 2.0 license (http://www.apache.org/licenses/LICENSE-2.0).