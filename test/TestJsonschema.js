define([
    'plugins/jsonschema!Schema1'
], function (
    schema1
) {

    'use strict';

    describe('jsonschema', function () {

        it('schema references are resolved correctly', function () {

            //assert down a couple of levels for first-class ids - we can make sure the recursive placement happened as well
            assert.equal('Schema1', schema1.id);
            assert.equal('Subobject1', schema1.properties.subobject.id);
            assert.equal('Subobject1', schema1.properties.subobject.properties.recursive.id);
            assert.equal('Subobject2', schema1.properties.subobject2.id);
            assert.equal('SubSubobject1', schema1.properties.subobject2.properties.recursiveArray.items.id);
            assert.equal('SubSubobject1', schema1.properties.subobject2.properties.recursiveArray.items.properties.recursive.id);

        });

    });

});

