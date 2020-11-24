const portfinder = require('portfinder');
const nodemon = require('nodemon');
const tunnel = require('./tunnel');
const project = require('../package.json').name;

(async () => {
  try {
    let port = process.env.PORT || 3000;

    portfinder.basePort = port;
    port = await portfinder.getPortPromise();

    tunnel({ port, project });

    process.env.PORT = port;
    nodemon('index.js');
    nodemon.on('quit', () => process.exit());
  } catch (error) {
    console.error(error);
  }
})();
