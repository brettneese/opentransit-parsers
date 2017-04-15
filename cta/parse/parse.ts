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

    var dataset = bigquery.dataset('my-dataset');
    var table = dataset.table('my-table');

    table.insert(rows, function (err) {
        if (err) {
            callback(err)
        };

        return callback(null, 'done')
    });
};

// export function toJson(xml, callback) {
//     parseString(xml, { mergeAttrs: true }, function (err, result) {
//         if (err) return callback(err);
//         else {
//             let r = _.omit(result.ctatt, 'tmst');
//             //console.log('toJson():' + JSON.stringify(r));
//             callback(null, r);
//         }
//     });
// }

// export function getObjectHash(s3Record, callback) {
//     s3.getObject({ Bucket: s3Record.bucket.name, Key: s3Record.object.key }, function (err, data) {

//         if (err) return callback(err);
//         else {
//             toJson(decoder.write(data.Body), function (err, json) {
//                 if (err) return callback(err);
//                 else {
//                     const r = md5(JSON.stringify(json));
//                     //console.log('getObjectHash():' + r);
//                     callback(null, r, s3Record, json);
//                 }
//             });
//         }
//     });
// // };

// export function checkIfDupe(objectHash, s3Record, json, callback) {
//     s3.listObjects({ Bucket: s3Record.bucket.name, Prefix: '_parsed/' + getPrefixWithoutSpecialPath(s3Record.object.key) }, function (err, data) {
//         var exists;

//         if (err) return callback(err)
//         else {
//             _.each(data.Contents, function (record) {
//                 const recordHash = _.last(record.Key.split('/'));
//                 console.log('recordHash:' + recordHash);
//                 console.log('objectHash:' + objectHash);

//                 if (recordHash === objectHash) {
//                     exists = true;
//                     return callback(true, 'exists')
//                 }
//             });

//             if (!exists) {
//                 return callback(null, objectHash, s3Record, json);
//             }
//         }
//     });
// }

// export function saveObject(objectHash, s3Record, json, callback) {
//     var buf = new Buffer(JSON.stringify(json), 'utf-8');

//     console.log('saving new object.....')
//     // console.log(json)

//     zlib.gzip(buf, function (err, result) {
//         if (err) return callback(err);
//         if (result) {
//             var params = {
//                 Bucket: s3Record.bucket.name,
//                 Key: "_parsed/" + getPrefixWithoutSpecialPath(s3Record.object.key) + "/" + objectHash + '.gz',
//                 Body: result,
//             };

//             s3.putObject(params, function (err, data) {
//                 if (err) return callback(err); // an error occurred
//                 else return callback(null, 'done', data); // successful response
//             });
//         }
//     });
// }

// export function responseHandler(err, result, cb) {

//     if (result === 'done') {
//         return cb(null, result)
//     } else if (result === 'exists') {
//         return cb('object already exists, exiting...')
//     } else if (err) {
//         return cb(err)
//     } else {
//         return cb('unknown error')
//     }
// }

// export function handler(event, context, cb) {
//     async.waterfall([
//         _.partial(parseS3Record, event),
//         getObjectHash,
//         checkIfDupe,
//         saveObject
//     ],
//         _.partial(responseHandler, _, _, cb)
//     );
// };

// export default handler;