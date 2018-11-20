const dialogflow = require('dialogflow');
const path = require('path');
const fs = require('fs');
const argv = require('minimist')(process.argv.slice(2));

const keyFile = path.resolve(__dirname, '../config/dialogflow.json');
const intentsFile = path.resolve(__dirname, '../config/intents.json');
const mode = argv._[0];

process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve(__dirname, keyFile);

const intentsClient = new dialogflow.IntentsClient();
const projectId = require(keyFile).project_id;
const projectAgentPath = intentsClient.projectAgentPath(projectId);

const getRemoteIntents = intentsClient
  .listIntents({ parent: projectAgentPath })
  .then(responses => responses[0])
  .catch(err => {
    console.error('Failed to list intents:', err);
  });

const localIntents = require('../config/intents.json');

if (mode === 'down') {
  getRemoteIntents.then(remoteIntents => {
    const intents = remoteToLocal(remoteIntents);
    fs.writeFileSync(intentsFile, JSON.stringify(intents));
    console.log(`Done syncing down. Intents written to ${intentsFile}.`);
  });
}

if (mode === 'up') {
  const localIntents = require(intentsFile);
  const intents = localToRemote(localIntents);
  Promise.all(intents.map(intent => intentsClient.createIntent({
    parent: projectAgentPath,
    intent
  }))).then(() => {
    console.log(`Done syncing up. ${intents.length} intents created.`);
  });
}

const remoteToLocal = intents => {
  const result = {};
  intents.forEach(intent => {
    result[intent.displayName] = {
      events: intent.events,
      isFallback: intent.isFallback,
      phrases: intent.trainingPhrases,
      contexts: intent.inputContextNames.map(context => context.split('/').pop())
    };
  });
  return result;
};

const localToRemote = intents => Object.keys(intents).map(key => {
  const node = intents[key];
  return {
    displayName: key,
    webhookState: 'WEBHOOK_STATE_ENABLED',
    events: node.events,
    isFallback: node.isFallback,
    trainingPhrases: node.phrases.map(phrase => ({
      type: 'EXAMPLE',
      parts: [phrase]
    }))
  };
});

// responses[0].forEach(intent => {
//   console.log('====================');
//   console.log(`Intent name: ${intent.name}`);
//   console.log(`Intent display name: ${intent.displayName}`);
//   console.log(`Action: ${intent.action}`);
//   console.log(`Root folowup intent: ${intent.rootFollowupIntentName}`);
//   console.log(`Parent followup intent: ${intent.parentFollowupIntentName}`);
//
//   console.log('Input contexts:');
//   intent.inputContextNames.forEach(inputContextName => {
//     console.log(`\tName: ${inputContextName}`);
//   });
//
//   console.log('Output contexts:');
//   intent.outputContexts.forEach(outputContext => {
//     console.log(`\tName: ${outputContext.name}`);
//   });
// });
