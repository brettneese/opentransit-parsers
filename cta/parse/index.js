var moment = require("moment-timezone"),
  AWS = require("aws-sdk"),
  _ = require("lodash"),
  async = require("async"),
  geohash = require("ngeohash"),
  BigQuery = require("@google-cloud/bigquery"),
  s3 = new AWS.S3(),
  zlib = require("zlib"),
  StringDecoder = require("string_decoder").StringDecoder,
  decoder = new StringDecoder("utf8");

require('dotenv').config({silent: true})

// javascript is so dumb
var isNumberic = function(num) {
  return !isNaN(num);
};

var parser = (module.exports = {});

parser.parseS3Record = function(data, callback) {
  try {
    var s3Record = data.Records[0].s3;
  } catch (e) {
    callback(e);
  }

  return callback(null, s3Record);
};

parser.getS3Object = function(s3Record, callback) {
  s3.getObject(
    { Bucket: s3Record.bucket.name, Key: s3Record.object.key },
    function(err, data) {
      if (err)
        return callback(err); // an error occurred
      else
        return callback(null, s3Record, data.Body); // successful response
    }
  );
};

parser.unzipObject = function(s3Record, buf, callback) {
  zlib.gunzip(buf, function(err, result) {
    if (err) return callback(err);

    if (result) {
      return callback(null, s3Record, JSON.parse(result));
    }
  });
};

parser.transformData = function(s3Record, data, callback) {
  try {
    var predictionResults = data.route;
    var returnData = [];

    _.each(predictionResults, function(element, index, list) {
      var trainsInRoute = element.train;

      //parsing
      _.each(trainsInRoute, function(train, property_index, list) {
        var item = _.mapValues(train, function(val, key) {
          if (isNumberic(val[0])) {
            return +val[0];
          }
          return val[0];
        });

        //mapping some things

        item.routeName = element.name[0];
        item.arrT = moment
          .tz(item.arrT, "YYYYMMDD HH:mm:ss", "America/Chicago")
          .unix();
        item.prdt = moment
          .tz(item.prdt, "YYYYMMDD HH:mm:ss", "America/Chicago")
          .unix();
        item.isApp = Boolean(item.isApp);
        item.isDly = Boolean(item.isDly);
        item.geohash = geohash.encode(item.lat, item.lon, 9);
        item.meta_errCd = data.errCd[0];
        item.meta_errNm = data.errNm[0];
        item.meta_s3Key = s3Record.object.key;

        // append to array
        returnData.push(item);
      });
    });
  } catch (e) {
    callback(e);
  }

  return callback(null, returnData);
};

parser.uploadToBQ = function(rows, callback) {
  var bigquery = BigQuery({
    keyFilename: './keyfile.json',
    projectId: process.env.BQ_PROJECTID
  });

  var dataset = bigquery.dataset(process.env.BQ_DATASET);
  var table = dataset.table(process.env.BQ_TABLE);

  table
    .insert(rows)
    .then(function(data) {
      return callback(null, "done");
    })
    .catch(function(err) {
      return callback(err);
    });
};

parser.responseHandler = function(err, result, cb) {
  if (result === "done") {
    return cb(null, result);
  }
  if (err) {
    return cb(JSON.stringify(err));
  } else {
    return cb("unknown error");
  }
};

parser.handler = function(event, context, cb) {
  async.waterfall(
    [
      _.partial(parser.parseS3Record, event),
      parser.getS3Object,
      parser.unzipObject,
      parser.transformData,
      parser.uploadToBQ
    ],
    _.partial(parser.responseHandler, _, _, cb)
  );
};
