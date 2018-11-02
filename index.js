const argv = require('minimist')(process.argv.slice(2));
const Kiai = require('kiai').default;
const ngrok = require('ngrok');

const { local, clientId } = argv;

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

// Loading the configuration for the file storage
const storageConfig = require('./config/storage.json');

// Loading the configuration for the analytics tracker
const trackingConfig = require('./config/tracking.json');

// Setting the function used to collect session data for the tracker
const trackingDataCollector = conv => ({
  device: {
    locale: conv.locale,
  },
  conversation: {
    flow: conv.currentFlow,
    intent: conv.currentIntent,
  }
});

// Load the main configuration
const config = require('./config/kiai.json');

// Instantiating Kiai
const app = new Kiai({
  ...config,
  flows,
  locales,
  localeMapping,
  dialog,
  voice,
  storageConfig,
  trackingConfig,
  trackingDataCollector,
});

// This adds support for the Dialogflow platform, support for other platforms to come
// clientId is required only if your Action implements account linking via Google Sign In.
// It can be retrieved through the Google Cloud console and can be set using the --client YOUR_CLIENT_ID commandline argument
app.addPlatform(Kiai.PLATFORMS.DIALOGFLOW, { clientId });

// This specifies which framework to use for running your endpoint(s)
// The current line ensures that when running with the --local switch, Express will be used, and Firebase otherwise
app.setFramework(local ? Kiai.FRAMEWORKS.EXPRESS : Kiai.FRAMEWORKS.FIREBASE);

// Add extra custom endpoints, like this one for importing data
app.framework.use('import', require('./lib/import'));

// Start ngrok if running locally
if (local) {
  ngrok.connect(process.env.PORT || 3000).then(url => {
    console.log('Public endpoints:'); // eslint-disable-line no-console
    app.framework.endpoints.forEach(endpoint => {
      console.log(`${url}${endpoint}`); // eslint-disable-line no-console
    });
  });
}

// Export the framework for FaaS services
module.exports = app.framework;
