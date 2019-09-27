const argv = require('minimist')(process.argv.slice(2));
const Kiai = require('kiai').default;
const port = require('./tools/port');
// const profiler = require('./lib/profiler');
const packageJson = require('./package.json');
const serveo = require('./tools/serveo');

const { local, clientId } = argv;

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

// This adds support for the Dialogflow platform, support for other platforms to come
// clientId is required only if your Action implements account linking via Google Sign In.
// It can be retrieved through the Google Cloud console and can be set using the --client YOUR_CLIENT_ID commandline argument
app.addPlatform(Kiai.PLATFORMS.DIALOGFLOW, { clientId });

if (local) {
  (async function() {
    try {
      process.env.PORT = await port(process.env.PORT || 3000);
    } catch (error) {
      console.error(error);
    }

    // Set up tunnel to Serveo for public proxy
    serveo({ subdomain: packageJson.name, port: process.env.PORT })
      .then(url => {
        console.log(`Remote proxy started: ${url} -> http://localhost:${process.env.PORT}`);
      })
      .catch(error => {
        console.error('Failed to start Serveo proxy:', error);
      });

    app.setFramework(Kiai.FRAMEWORKS.EXPRESS);

    // app.framework.use('import', require('./lib/import'));
    // app.framework.use('export', require('./lib/export'));
    // app.framework.use('delete', require('./lib/delete'));
  })();
} else {
  app.setFramework(Kiai.FRAMEWORKS.FIREBASE);

  module.exports = {
    [`v${MAJOR_VERSION}`]: app.framework,
  };
}
