const portfinder = require('portfinder');

module.exports = basePort => {
  portfinder.basePort = basePort;
  return new Promise((resolve, reject) => {
    portfinder.getPort((err, port) => {
      if (err) return reject(err);
      return resolve(port);
    });
  });
};
