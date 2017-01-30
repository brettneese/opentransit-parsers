import waterfall from 'async/waterfall';
import Parser from '/dedupe/dedupe';

exports.dedupe = function(event, context, cb) {
    async.waterfall([
            function(cb) {
                cb(null, event);
            },
            Parser.getS3Record,
            Parser.getObjectHash,
            Parser.checkIfDupe,
            Parser.saveObject
        ],
        errorHandler(error, result, cb)
    );
};