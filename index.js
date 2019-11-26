const fs = require('fs');
const Kiai = require('kiai').default;
const argv = require('minimist')(process.argv.slice(2));
const packageJson = require('./package.json');

const { local } = argv;

const MAJOR_VERSION = packageJson.version.split('.').shift();

// Import the flow definitions
const flows = require('./flows');

// Import the translation files
const locales = {
  'en-US': require('./config/language/en-US.json'),
  'es-419': require('./config/language/es-419.json'),
};

// Import the dialog files
const dialog = {
  'en-US': require('./config/dialog/en-US.json'),
  'es-419': require('./config/dialog/es-419.json'),
};

// Import the voice-over indexes
const voice = {
  'en-US': require('./config/voice/en-US.json'),
  'es-419': require('./config/voice/es-419.json'),
};

// Optionally set a locale mapping, to map multiple different client locales to a single locale
const localeMapping = require('./config/localeMapping.json');

// Load the configuration for the file storage
const storage = require('./config/storage.json');

// Load the configuration for the analytics tracker
const tracking = require('./config/tracking.json');

// Set the function used to collect session data for the tracker
tracking.dataCollector = conv => ({
  device: { locale: conv.locale },
  conversation: { flow: conv.currentFlow, intent: conv.currentIntent },
});

// Instantiate Kiai
const app = new Kiai({
  flows,
  locales,
  localeMapping,
  dialog,
  voice,
  storage,
  tracking,
});

const clientId = fs.readFileSync('./config/CLIENT_ID').toString();

app.addPlatform(Kiai.PLATFORMS.DIALOGFLOW, { clientId });

app.setFramework(local ? Kiai.FRAMEWORKS.EXPRESS : Kiai.FRAMEWORKS.FIREBASE, {
  port: process.env.PORT,
});

// app.framework.use('import', require('./lib/import'));
// app.framework.use('export', require('./lib/export'));
// app.framework.use('delete', require('./lib/delete'));

// Export the framework for FaaS services
module.exports = { [`v${MAJOR_VERSION}`]: app.framework };
