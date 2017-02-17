var path = require('path');

module.exports = {
    externals: ['aws-sdk'],
    entry: './cta/dedupe/dedupe.ts',
    target: 'node',
    module: {
        loaders: [
            { test: /\.ts(x?)$/, loader: 'ts-loader' }
        ]
    },
    resolve: {
        extensions: ['.ts', '.js', '.tsx', '.jsx', '']
    },
    output: {
        libraryTarget: 'commonjs',
        path: path.join(__dirname, '.webpack'),
        filename: 'cta/dedupe/dedupe.js'
    },
};