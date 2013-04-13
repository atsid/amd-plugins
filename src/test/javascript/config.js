(function () {
    require.config({
        baseUrl: "/test/src",
        paths: {
            plugins: "main/javascript",
            test: "test/javascript"
        },
        //below is config for the plugins that we're going to test out
        config: {
            "plugins/ioc": {
                "beans": {
                    "test/FakeModule": {
                        "type": "test/FakeModule",
                        "params": {
                            "name": "hello"
                        }
                    }
                }
            }
        }
    });
}());
