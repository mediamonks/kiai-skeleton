const portfinder = require('portfinder');
const nodemon = require('nodemon');
const tunnel = require('./tunnel');
const { name, region } = require('../package.json');

(async () => {
  try {
    let port = process.env.PORT || 3000;

    portfinder.basePort = port;
    port = await portfinder.getPortPromise();

    tunnel({ port, project: name, region });

    process.env.PORT = port;
    nodemon('index.js');
  } catch (error) {
    console.error(error);
  }
})();
