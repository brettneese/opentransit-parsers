var moment = require('moment-timezone'),
    AWS = require('aws-sdk'),
    md5 = require('md5'),
    _ = require('lodash'),
    async = require('async'),
    geohash = require('ngeohash'),
    s3 = new AWS.S3(),
    BigQuery = require('@google-cloud/bigquery');


var zlib = require('zlib'),
    StringDecoder = require('string_decoder').StringDecoder,
    decoder = new StringDecoder('utf8');


// javascript is so dumb
var isNumberic = function (num) {
    return !isNaN(num);
};

export function parseS3Record(data, callback) {

    try {
        var s3Record = data.Records[0].s3
    } catch (e) {
        callback(e)
    }

    return callback(null, s3Record)
}


export function getS3Object(s3Record, callback) {
        s3.getObject({ Bucket: s3Record.bucket.name, Key: s3Record.object.key }, function (err, data) {
            if (err) return callback(err); // an error occurred
            else return callback(null, s3Record, data.Body);           // successful response
        });
}

export function unzipObject(s3Record, buf, callback) {
    zlib.gunzip(buf, function (err, result) {
        if (err) return callback(err);
        
        if (result) {
            return callback(s3Record, JSON.parse(result))
        }
    });
}

export function transformData(s3Record, data, callback) {
    try {
        var predictionResults = data.route;
        var returnData = [];

        _.each(predictionResults, function (element, index, list) {
            var trainsInRoute = element.train;

            //parsing
            _.each(trainsInRoute, function (train, property_index, list) {
                var item = _.mapValues(train, function (val, key) {
                    if (isNumberic(val[0])) {
                        return +val[0];
                    }
                    return val[0];
                });

                //mapping some things

                item.routeName = element.name[0];
                item.arrT = moment.tz(item.arrT, "YYYYMMDD HH:mm:ss", "America/Chicago").unix();
                item.prdt = moment.tz(item.prdt, "YYYYMMDD HH:mm:ss", "America/Chicago").unix();
                item.isApp = Boolean(item.isApp);
                item.isDly = Boolean(item.isDly);
                item.geohash = geohash.encode(item.lat, item.lon, 9);
                item.meta_errCd = data.errCd[0];
                item.meta_errNm = data.errNm[0];
                item.meta_s3Key = s3Record.object.key;

                // append to array
                returnData.push(item)
            });
        });

    } catch (e) {
        callback(e)
    }

    return callback(null, returnData)
}

export function uploadToBQ(rows, callback) {

    var bigquery = BigQuery({
        projectId: 'opentransit-org'
    });

    var dataset = bigquery.dataset('cta_dev');
    var table = dataset.table('trains');

    table.insert(rows)
        .then(function (data) {
            return callback(null, 'done');
        })
        .catch(function (err) {
            return callback(err);
        })
};


export function responseHandler(err, result, cb) {

    if (result === 'done') {
        return cb(null, result)
    } if (err) {
        return cb(err)
    } else {
        return cb('unknown error')
    }
}

export function handler(event, context, cb) {
    async.waterfall([
        _.partial(parseS3Record, event),
        getS3Object,
        unzipObject,
        transformData,
        uploadToBQ,
    ],
        _.partial(responseHandler, _, _, cb)
    );
};

export default handler;