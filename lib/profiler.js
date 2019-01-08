const fs = require('fs');
const { performance } = require('perf_hooks');
const config = require('../config/profiler.json');

const labels = {};

module.exports = {
  start(label) {
    if (label in labels) console.warn('Profiler: starting label which was already started!'); // eslint-disable-line no-console
    labels[label] = performance.now();
  },

  end(label) {
    const result = performance.now() - labels[label];
    delete labels[label];
    setImmediate(() =>
      fs.appendFileSync(config.outputFile, `${new Date().toISOString()}\t${label}\t${result}\n`),
    );
  },
};
