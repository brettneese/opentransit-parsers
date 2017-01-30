const parseString = require('xml2js').parseString,
    AWS = require('aws-sdk'),
    md5 = require('md5'),
    s3 = new AWS.S3(),
    _ = require('lodash');

const zlib = require('zlib'),
    StringDecoder = require('string_decoder').StringDecoder,
    decoder = new StringDecoder('utf8');

class Processor {

    static getPrefix(path) {
        const array = path.split('/');
        const arrayFirstElements = _.initial(array)

        return arrayFirstElements.join("/")
    }

    // gets the prefix without the _raw or _parsed special path
    static getPrefixWithoutSpecialPath(path) {

        const array = path.split('/');
        const arrayElements = _.initial(array)
        arrayElements.shift();

        return arrayElements.join("/")
    }

    parseS3Record(data, callback) {
        try {
            const s3Record = event.Records[0].s3
        } catch (e) {
            callback(e)
        }

        return callback(null, s3Record)
    }

    toJson(data, callback) {
        parseString(data, { mergeAttrs: true }, function(err, result) {
            if (err) return cb(err);
            else return callback(null, _.omit(result.ctatt, 'tmst'));
        });
    }

    getObjectHash(s3Record, callback) {
        s3.getObject({ Bucket: s3Record.bucket.name, Key: s3Record.object.key, }, function(err, data) {
            if (err) return callback(err)
            else {
                toJson(decoder.write(data.Body), function(err, result) {
                    if (err) return callback(err);
                    else return callback(null, md5(result), s3Record, result);
                });
            }
        });
    };

    checkIfDupe(objectHash, s3Record, object, callback) {
        s3.listObjectsV2({ Bucket: s3Record.bucket.name, Prefix: 'raw/' + getPrefix(s3Record.object.key) }, function(err, data) {
            if (err) return callback(err)
            else {
                _.each(data.Contents, function(record) {
                    recordHash = _.last(record.Key.split('/'));
                    if (recordHash === objectHash) return callback(null, 'exists')
                });

                return callback(null, objectHash, s3Record, object);
            }
        });
    }

    saveObject(objectHash, s3Record, object, callback) {
        var buf = new Buffer(JSON.stringify(object), 'utf-8');

        zlib.gzip(buf, function(_, result) {
            var params = {
                Bucket: s3Record.bucket.name,
                Key: "_parsed/" + getPrefixWithoutSpecialPath(s3Record.object.key) + "/" + objectHash,
                Body: result,
            };

            s3.putObject(params, function(err, data) {
                if (err) return callback(err); // an error occurred
                else return callback(null, 'done', data); // successful response
            });
        });

    }

    errorHandler(err, result, data, cb) {
        if (result === 'done') {
            console.log(data)
            cb(null, result)
        } else if (result === 'exists') {
            console.log("object already exists, exiting...")
            cb()
        } else if (err) {
            cb(err)
        } else {
            cb(true)
        }
    }

};

export default Processor;