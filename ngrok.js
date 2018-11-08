const fs = require('fs');
const endpoints = require('minimist')(process.argv.slice(2))._;
const ngrok = require('ngrok');

const pidFile = 'ngrok.pid';

if (fs.existsSync(pidFile)) {
  const isStale = Date.now() - fs.statSync(pidFile).mtimeMs >= 24 * 60 * 60 * 1000;
  const pid = fs.readFileSync(pidFile);
  const isRunning = require('is-running')(pid);
  if (isRunning) {
    if (isStale) process.kill(pid);
    else process.exit(0);
  }
}

fs.writeFileSync(pidFile, process.pid);

ngrok.connect(process.env.PORT || 3000).then(url => {
  console.log('Public endpoints:'); // eslint-disable-line no-console
  endpoints.forEach(endpoint => {
    console.log(`${url}${endpoint}`); // eslint-disable-line no-console
  });
});
