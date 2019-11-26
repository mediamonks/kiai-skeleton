const portfinder = require('portfinder');
const localtunnel = require('localtunnel');
const nodemon = require('nodemon');
const nodeCleanup = require('node-cleanup');
const serveo = require('./serveo');
const subdomain = require('../package.json').name;

const connectLocalTunnel = ({ port, subdomain }) =>
  new Promise((resolve, reject) => {
    try {
      localtunnel(port, { subdomain }, (error, tunnel) => {
        if (error) return reject(error);
        nodeCleanup(() => tunnel.close());
        resolve(tunnel.url);
      });
    } catch (error) {
      reject(error);
    }
  });

(async () => {
  try {
    let port = process.env.PORT || 3000;

    portfinder.basePort = port;
    port = await portfinder.getPortPromise();

    serveo({ port, subdomain })
      .catch(() => connectLocalTunnel({ port, subdomain }))
      .then(url => {
        console.log(`Tunnel open: ${url} -> http://localhost:${port}`);
      })
      .catch(error => {
        console.error(error);
      });

    process.env.PORT = port;
    nodemon('index.js --local');
  } catch (error) {
    console.error(error);
  }
})();
