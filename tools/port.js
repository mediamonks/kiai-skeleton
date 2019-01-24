const portfinder = require('portfinder');

portfinder.basePort = 3000;
portfinder.getPort((err, port) => {
  if (err) {
    console.error(err);
    process.stderr.write(err);
    process.exit(1);
    return;
  }

  process.stdout.write(String(port));
  process.exit();
});
