import * as assert from "assert"
import * as chai from "chai"
import Processor from "dedupe"

chai.use(require('chai-json-schema'))

describe('getS3Record()', function() {

    it('should return a valid s3 record from a AWS event', function() {
        const event = require('event');

        // only validate things we actually need from: http://docs.aws.amazon.com/AmazonS3/latest/dev/notification-content-structure.html
        const s3Schema = {
            title: "s3 object schema",
            type: "object",
            required: ["bucket", "object"],
            properties: {
                bucket: {
                    type: "object",
                    properties: {
                        type: "object",
                        properties: {
                            required: ["name"],
                            name: { type: "string" }
                        }
                    },
                    object: {
                        type: "object",
                        properties: {
                            required: ["key"],
                            properties: {
                                key: { type: "string" }
                            }
                        }
                    }
                },
            },
        }

        Processor.parseS3Record(event, function(err, response) {
            expect(err).to.not.exist;
            expect(response).to.be.jsonSchema(s3Schema)
        });

    });

});

describe('toJson()', function() {

});

describe('getPrefix()', function() {

});

describe('getPrefixWithoutSpecialPath()', function() {

});

describe('getObjectHash()', function() {

});

describe('checkIfDupe()', function() {

});

describe('saveObject()', function() {

});