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
                    "fakemodule1": {
                        "type": "test/FakeModule",
                        "params": {
                            "name": "hello"
                        }
                    },
                    //no params on this one, as we're going to pass them into load() directly
                    "fakemodule2": {
                        "type": "test/FakeModule"
                    }
                }
            },
            "plugins/jsonschema": {
                formatter: function (name) {
                    return "test/schema/" + name + ".json";
                }
            }
        }
    });
}());
