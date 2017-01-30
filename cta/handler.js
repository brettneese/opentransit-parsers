import waterfall from 'async/waterfall';
import dedupe from './dedupe/dedupe';

exports.dedupe = function(event, context, cb) {
    async.waterfall([
            function(cb) {
                cb(null, event);
            },
            Proccessor.getS3Record,
            Proccessor.getObjectHash,
            Proccessor.checkIfDupe,
            Proccessor.saveObject
        ],
        errorHandler(error, result, cb)
    );
};