import * as assert from "assert"
import * as chai from "chai"
import Processor from "dedupe"

chai.use(require('chai-json-schema'))

describe('getS3Record()', function() {

    it('should return a valid s3 record from an AWS event', function() {
        const event = require("testdata").awsEvent;

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
    it('should return a valid JSON object from an xml object', function() {
        const event = require("testdata").xml;

        expect(err).to.not.exist;
    });
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