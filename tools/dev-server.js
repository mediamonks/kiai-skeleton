const portfinder = require('portfinder');
const localtunnel = require('localtunnel');
const nodemon = require('nodemon');
const nodeCleanup = require('node-cleanup');
// const serveo = require('./serveo');
const subdomain = require('../package.json').name;

(async () => {
  try {
    let port = process.env.PORT || 3000;

    portfinder.basePort = port;
    port = await portfinder.getPortPromise();

    localtunnel(port, { subdomain }, (error, tunnel) => {
      if (error) throw error;
      console.log(`Tunnel open: ${tunnel.url} -> http://localhost:${port}`);
      nodeCleanup(() => tunnel.close());
    });

    // serveo(port, { subdomain }).then(url => {
    //   console.log(`Tunnel open: ${url} -> http://localhost:${port}`);
    // });

    process.env.PORT = port;
    nodemon('index.js --local');
  } catch (error) {
    console.error(error);
  }
})();
