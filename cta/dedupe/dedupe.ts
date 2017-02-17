
const parseString = require('xml2js').parseString,
    AWS = require('aws-sdk'),
    md5 = require('md5'),
    _ = require('lodash'),
    async = require('async'),
    s3 = new AWS.S3();

const zlib = require('zlib'),
    StringDecoder = require('string_decoder').StringDecoder,
    decoder = new StringDecoder('utf8');

var awsCb;

export function getPrefix(path) {
    const array = path.split('/');
    const arrayFirstElements = _.initial(array)

    return arrayFirstElements.join("/")
}

// gets the prefix without the _raw or _parsed special path
function getPrefixWithoutSpecialPath(path) {

    const array = path.split('/');
    const arrayElements = _.initial(array)
    arrayElements.shift();

    return arrayElements.join("/")
}

export function parseS3Record(data, callback) {
    console.log(JSON.stringify(data))
    try {
        var s3Record = data.Records[0].s3
    } catch (e) {
        callback(e)
    }

    return callback(null, s3Record)
}

export function toJson(xml, callback) {
    parseString(xml, { mergeAttrs: true }, function (err, result) {
        if (err) return callback(err);
        else {
            let r = _.omit(result.ctatt, 'tmst');
            console.log('toJson():' + JSON.stringify(r));
            callback(null, r);
        }
    });
}

export function getObjectHash(s3Record, callback) {
    s3.getObject({ Bucket: s3Record.bucket.name, Key: s3Record.object.key }, function (err, data) {

        if (err) return callback(err);
        else {
            toJson(decoder.write(data.Body), function (err, json) {
                if (err) return callback(err);
                else {
                    const r = md5(JSON.stringify(json));
                    console.log('getObjectHash():' + r);
                    callback(null, r, s3Record, json);
                }
            });
        }
    });
};

export function checkIfDupe(objectHash, s3Record, json, callback) {
    s3.listObjects({ Bucket: s3Record.bucket.name, Prefix: '_parsed/' + getPrefixWithoutSpecialPath(s3Record.object.key) }, function (err, data) {
        var exists;

        if (err) return callback(err)
        else {
            _.each(data.Contents, function (record) {
                const recordHash = _.last(record.Key.split('/'));
                console.log('recordHash:' + recordHash);
                console.log('objectHash:' + objectHash);

                if (recordHash === objectHash) {
                    exists = true;
                    return callback(true, 'exists')
                }
            });

            if (!exists) {
                return callback(null, objectHash, s3Record, json);
            }
        }
    });
}

export function saveObject(objectHash, s3Record, json, callback) {
    var buf = new Buffer(JSON.stringify(json), 'utf-8');

    console.log('saving new object.....')
    console.log(json)

    zlib.gzip(buf, function (err, result) {
        if (err) return callback(err);
        if (result) {
            var params = {
                Bucket: s3Record.bucket.name,
                Key: "_parsed/" + getPrefixWithoutSpecialPath(s3Record.object.key) + "/" + objectHash,
                Body: result,
            };

            s3.putObject(params, function (err, data) {
                if (err) return callback(err); // an error occurred
                else return callback(null, 'done', data); // successful response
            });
        }
    });
}

export function responseHandler(err, result, cb) {

    if (result === 'done') {
        return cb(null, result)
    } else if (result === 'exists') {
        return cb('object already exists, exiting...')
    } else if (err) {
        return cb(err)
    } else {
        return cb('unknown error')
    }
}

export function handler(event, context, cb) {
    async.waterfall([
        _.partial(parseS3Record, event),
        getObjectHash,
        checkIfDupe,
        saveObject
    ],
        _.partial(responseHandler, _, _, cb)
    );
};

export default handler;