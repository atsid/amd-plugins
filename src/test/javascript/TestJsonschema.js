require([
    "plugins/jsonschema!Schema1"
], function (
    schema1
) {

    TestCase("TestJsonSchema", {

        testLoadJsonSchema: function () {
            //assert down a couple of levels for first-class ids - we can make sure the recursive placement happened as well
            jstestdriver.console.log("schema1.id: " + schema1.id);
            jstestdriver.console.log("subobject1.id: " + schema1.properties.subobject.id);
            jstestdriver.console.log("subobject1.recursive.id: " + schema1.properties.subobject.properties.recursive.id);
            jstestdriver.console.log("subobject2.id: " + schema1.properties.subobject2.id);
            jstestdriver.console.log("subobject2.recursiveArray.id: " + schema1.properties.subobject2.properties.recursiveArray.items.id);
            jstestdriver.console.log("subobject2.recursiveArray.id.recursive.id: " + schema1.properties.subobject2.properties.recursiveArray.items.properties.recursive.id);

            assertEquals("Schema1", schema1.id);
            assertEquals("Subobject1", schema1.properties.subobject.id);
            assertEquals("Subobject1", schema1.properties.subobject.properties.recursive.id);
            assertEquals("Subobject2", schema1.properties.subobject2.id);
            assertEquals("SubSubobject1", schema1.properties.subobject2.properties.recursiveArray.items.id);
            assertEquals("SubSubobject1", schema1.properties.subobject2.properties.recursiveArray.items.properties.recursive.id);
        }

    });

});

