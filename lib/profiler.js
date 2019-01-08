const fs = require('fs');
const config = require('../config/profiler.json');

const NS_PER_SEC = 1e9;
const NS_PER_MS = 1e6;
const bigintSupported = typeof process.hrtime.bigint === 'function';
const labels = {};

module.exports = {
  start(label) {
    if (label in labels) console.warn('Profiler: starting label which was already started!'); // eslint-disable-line no-console
    labels[label] = bigintSupported ? process.hrtime.bigint() : process.hrtime();
  },

  end(label) {
    let result;
    if (bigintSupported) {
      result = process.hrtime.bigint() - labels[label];
    } else {
      result = process.hrtime(labels[label]);
      result = result[0] * NS_PER_SEC + result[1];
    }
    delete labels[label];
    setImmediate(() =>
      fs.appendFileSync(
        config.outputFile,
        `${new Date().toISOString()}\t${label}\t${result / NS_PER_MS}\n`,
      ),
    );
  },
};
