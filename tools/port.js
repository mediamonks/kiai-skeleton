const portfinder = require('portfinder');

portfinder.basePort = 3000;
portfinder.getPort((err, port) => {
  process.stdout.write(String(port));
  process.exit();
});
