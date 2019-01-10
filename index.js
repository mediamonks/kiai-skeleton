const argv = require('minimist')(process.argv.slice(2));
const Kiai = require('kiai').default;
// const profiler = require('./lib/profiler');

const { local, clientId } = argv;
const MAJOR_VERSION = require('./package.json')
  .version.split('.')
  .shift();

// Import the flow definitions
const flows = {
  general: require('./flows/general'),
  example: require('./flows/example'),
};

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
  device: {
    locale: conv.locale,
  },
  conversation: {
    flow: conv.currentFlow,
    intent: conv.currentIntent,
  },
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

// This adds support for the Dialogflow platform, support for other platforms to come
// clientId is required only if your Action implements account linking via Google Sign In.
// It can be retrieved through the Google Cloud console and can be set using the --client YOUR_CLIENT_ID commandline argument
app.addPlatform(Kiai.PLATFORMS.DIALOGFLOW, { clientId });

// This specifies which framework to use for running your endpoint(s)
// The current line ensures that when running with the --local switch, Express will be used, and Firebase otherwise
app.setFramework(local ? Kiai.FRAMEWORKS.EXPRESS : Kiai.FRAMEWORKS.FIREBASE);

// Add extra custom endpoints, like these for importing and exporting data
// app.framework.use('import', require('./lib/import'));
// app.framework.use('export', require('./lib/export'));

// Export the framework for FaaS services
module.exports = {
  flows,
  [`v${MAJOR_VERSION}`]: app.framework,
};
