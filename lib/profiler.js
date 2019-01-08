const fs = require('fs');
const config = require('../config/profiler.json');

const NS_PER_SEC = 1e9;
const NS_PER_MS = 1e6;
const labels = {};

module.exports = {
  start(label) {
    if (label in labels) console.warn('Profiler: starting label which was already started!'); // eslint-disable-line no-console
    labels[label] = process.hrtime();
  },

  end(label) {
    const result = process.hrtime(labels[label]);
    delete labels[label];
    setImmediate(() =>
      fs.appendFileSync(
        config.outputFile,
        `${new Date().toISOString()}\t${label}\t${(result[0] * NS_PER_SEC + result[1]) /
          NS_PER_MS}\n`,
      ),
    );
  },
};
