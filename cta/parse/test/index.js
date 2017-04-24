var expect = require("chai").expect,
  zlib = require("zlib"),
  proxyquire = require("proxyquire").noCallThru(),
  AWSMock = require("mock-aws-s3"),
  StringDecoder = require("string_decoder").StringDecoder,
  decoder = new StringDecoder("utf8"),
  appRoot = require("app-root-path"),
  md5 = require("md5");

AWSMock.config.basePath = appRoot + "/cta/parse/test_data";
var Parser = proxyquire("../index", { "aws-sdk": AWSMock });

var testData = require("./testData");

describe("parseS3Record()", function() {
  it("should return a valid s3 record from an AWS event", function(done) {
    Parser.parseS3Record(testData.event, function(err, response) {
      if (err) done(err);

      expect(response.bucket.name).to.be.a("string");

      done();
    });
  });
});

describe("getS3Object()", function() {
  it("should return a buffer of the gzipped object data from the s3 record", function(done) {
    Parser.getS3Object(testData.s3Record, function(err, response) {
      if (err) done(err);

      expect(response).to.be.a("object");

      done();
    });
  });
});

describe("unzipObject()", function() {
  it("should return a valid javascript object from a gzipped s3 object", function(done) {
    Parser.unzipObject(
      testData.s3Record,
      new Buffer(testData.gzipHex, "hex"),
      function(err, response) {
        expect(response).to.be.a("object");

        done();
      }
    );
  });
});

describe("transformData()", function() {
  it("should return an array of transformed train predictions", function(done) {
    Parser.transformData(
      testData.s3Record,
      testData.json,
      function(err, response) {
        if (err) done(err);

        expect(response[0]).to.be.a("object");
        expect(response[0].routeName).to.exist;
        expect(response).to.be.a("array");

        done();
      }
    );
  });
});

describe("uploadToBQ()", function() {
  it("should upload the train predictions to big query without an error", function(done) {
    Parser.uploadToBQ(testData.trainArray, function(err, response) {
      if (err) done(err);

      expect(response).to.exist;
      done();
    });
  });
});

describe("responseHandler()", function() {
  it("should return results if the function runs correctly", function(done) {
    Parser.responseHandler(null, "done", function(err, result) {
      if (err) done(err);

      expect(result).to.equal("done");
      expect(err).to.not.exist;

      done();
    });
  });

  it("should return the error if there is an error", function(done) {
    Parser.responseHandler(new Error("error"), null, function(err, result) {
      expect(err).to.exist;
      expect(result).to.not.exist;

      done();
    });
  });
});
