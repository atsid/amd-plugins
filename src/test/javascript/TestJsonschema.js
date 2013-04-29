require([
    "plugins/jsonschema!Schema1"
], function (
    schema1
) {

    TestCase("TestJsonSchema", {

        testLoadJsonSchema: function () {
            //assert down a couple of levels for first-class ids - we can make sure the recursive placement happened as well
            jstestdriver.console.log("schema1.id: " + schema1.id);
            assertEquals("Schema1", schema1.id);
            assertEquals("Subobject1", schema1.properties.subobject.id);
            assertEquals("Subobject1", schema1.properties.subobject.properties.recursive.id);
        }

    });

});

