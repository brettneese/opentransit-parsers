var path = require('path');

module.exports = {
    externals: ['aws-sdk'],
    entry: {
        ctaDedupe: './cta/dedupe/dedupe.ts',
        ctaParse: './cta/parse/parse.js'
    },
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
        filename: '[name].js'
    },
};