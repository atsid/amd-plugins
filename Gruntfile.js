'use strict';

module.exports = function (grunt) {

    grunt.initConfig({
        jshint: {
            src: ['js/**/*.js', 'test/**/*.js', '!node_modules/**/*.*', '!test/lib/**/*.js'],
            options: {
                jshintrc: '.jshintrc'
            }
        },
        karma: {
            unit: {
                configFile: 'karma.conf.js',
                singleRun: true
            }
        },
        watch: {
            js: {
                files: ['**/*.js', '!**/node_modules/**'],
                tasks: ['lint', 'test']
            }
        },
        requirejs: {
            compile: {
                options: {
                    baseUrl: './js',
                    paths: {
                        plugins: '.'
                    },
                    include: [
                        'plugins/ioc',
                        'plugins/jsonschema',
                        'plugins/properties',
                        'plugins/windower',
                        'plugins/xhr'],
                    out: 'amd-plugins-min.js'
                }
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-requirejs');
    grunt.loadNpmTasks('grunt-karma');

    grunt.registerTask('lint', ['jshint']);
    grunt.registerTask('test', ['karma']);
    grunt.registerTask('compile', ['requirejs']);
    grunt.registerTask('default', ['lint', 'test']);

};
