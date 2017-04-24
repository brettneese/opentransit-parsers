var testData = require("./testData"),
    expect = require('chai').expect,
    zlib = require('zlib'),
    proxyquire = require('proxyquire').noCallThru(),
    AWSMock = require('mock-aws-s3'),
    StringDecoder = require('string_decoder').StringDecoder,
    decoder = new StringDecoder('utf8'),
    appRoot = require('app-root-path'),
    md5 = require('md5');

AWSMock.config.basePath = appRoot + '/cta/dedupe/test' // Can configure a basePath for your local buckets
var Parser = proxyquire('../index', { 'aws-sdk': AWSMock });

describe('parseS3Record()', function () {
    it('should return a valid s3 record from an AWS event', function (done) {
        Parser.parseS3Record(testData.event, function (err, response) {
            if (err) done(err);
            expect(response.bucket.name).to.be.a('string');
            done();
        });
    });
});

describe('toJson()', function () {
    it('should return a valid JSON object from an xml object', function (done) {
        Parser.toJson(testData.xml, function (err, response) {
            if (err) done(err);
            expect(response).to.be.a('object');
            done();
        });
    });
});

describe('getObjectHash()', function () {
    it('should return a hash', function (done) {
        Parser.getObjectHash(testData.s3Record, function (err, response) {
            if (err) done(err);
            expect(response).to.be.a('string');
            done();
        });
    });
});

describe('checkIfDupe()', function () {
    it('should return exists if hash already exists', function (done) {
        Parser.checkIfDupe(testData.objectHash, testData.s3Record, testData.json, function (err, response) {
            expect(response).to.equal('exists');
            done();
        });
    });

    it('should return the objectHash, s3record, and object if hash does not exist', function (done) {
        const event = require("./test_data/test_data").s3record;

        Parser.checkIfDupe('testHash', testData.s3Record, testData.json, function (err, objectHash, s3record, json) {
            if (err) done(err);

            expect(objectHash).to.exist;
            expect(s3record).to.exist;
            expect(json).to.exist;

            done();
        });
    });
});


describe('responseHandler()', function () {
    it('should return results if the function runs correctly', function (done) {
        Parser.responseHandler(null, 'done', function (err, result) {
            if (err) done(err);
            expect(result).to.equal('done');
            expect(err).to.not.exist;
            done();
        });
    });

    it('should return the object already exists message if the object already exists', function (done) {
        Parser.responseHandler(null, 'exists', function (err, result) {
            if (err) done(err);
            expect(err).to.not.exist;
            expect(result).to.equal('object already exists, exiting...');
            done();
        });
    });

    it('should return the error if there is an error', function (done) {
        Parser.responseHandler(new Error('error'), null, function (err, result) {
            expect(err).to.exist;
            expect(result).to.not.exist;
            done();
        });
    });
});

describe('saveObject()', function () {
    let s3 = new AWSMock.S3();

    it('should save the object without errors', function (done) {
        Parser.saveObject(testData.objectHash, testData.s3Record, testData.json, function (err, response) {
            if (err) done(err);

            expect(response).to.equal('done');
            done();
        });
    });

    it('should be able to load and unzip the file', function (done) {
        s3.getObject({ Bucket: testData.s3RecordParsed.bucket.name, Key: testData.s3RecordParsed.object.key }, function (err, data) {
            if (err) done(err);

            zlib.gunzip(data.Body, null, function (err, result) {
                if (err) done(err);

                expect(md5(data)).to.equal(testData.objectHash)
                expect(data).to.be.a('object');
                expect(err).to.not.exist;

                done();
            });
        });
    });
});
