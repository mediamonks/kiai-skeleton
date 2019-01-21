const cp = require('child_process');

const serveo = ({ subdomain, port = 3000 }) =>
  new Promise((resolve, reject) => {
    const ssh = cp.spawn('ssh', ['-R', `${subdomain}:80:localhost:${port}`, 'serveo.net']);

    let lastError = '';

    process.on('exit', () => {
      ssh.kill();
    });

    ssh.on('error', error => {
      reject(error);
    });

    ssh.stdout.on('data', data => {
      const url = data.toString('ascii').match(/https:\/\/[^\s]+/)[0];
      resolve(url);
    });

    ssh.stderr.on('data', data => {
      lastError = data.toString('ascii');
    });

    ssh.on('close', () => {
      console.error(`SSH tunnel error: ${lastError}`);
    });
  });

module.exports = serveo;
