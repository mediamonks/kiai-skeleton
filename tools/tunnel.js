const cp = require('child_process');

const tunnel = ({ project, port = 3000, region = 'eu' }) => {
  const ssh = cp.spawn('ssh', [
    '-nNT',
    '-R',
    `/var/projects/${project}/dev.sock:localhost:${port} ${project}@${region}.dev.monkapps.com`,
  ]);

  process.on('exit', () => {
    ssh.kill();
  });

  ssh.on('error', error => {
    console.error(`Tunnel error: ${error}`);
  });

  ssh.stdout.on('data', data => {
    console.log(`Tunnel: ${data}`);
  });

  ssh.stderr.on('data', data => {
    console.error(`Tunnel error: ${data}`);
  });

  ssh.on('close', () => {
    console.log('Tunnel closed');
  });
};

module.exports = tunnel;
