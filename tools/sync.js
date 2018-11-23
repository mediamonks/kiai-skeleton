const dialogflow = require('dialogflow');
const path = require('path');
const fs = require('fs');
const argv = require('minimist')(process.argv.slice(2));
const _ = require('lodash');

const keyFile = path.resolve(__dirname, '../config/dialogflow.json');
const intentsFile = path.resolve(__dirname, '../config/intents.json');
const mode = argv._[0];

process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve(__dirname, keyFile);

const intentsClient = new dialogflow.IntentsClient();
const agentsClient = new dialogflow.AgentsClient();
const projectId = require(keyFile).project_id;
const intentsParent = intentsClient.projectAgentPath(projectId);
const agentParent = agentsClient.projectPath(projectId);

const getRemoteIntents = languageCode =>
  intentsClient
    .listIntents({ parent: intentsParent, languageCode, intentView: 1 })
    .then(responses => responses[0])
    .catch(err => {
      console.error('Failed to retrieve intents:', err);
    });

const deleteIntent = id => {
  const intentPath = intentsClient.intentPath(projectId, id);
  return intentsClient.deleteIntent({ name: intentPath }).catch(err => {
    console.error('Failed to delete intent:', err);
  });
};

const getLanguages = () =>
  agentsClient
    .getAgent({ parent: agentParent })
    .then(responses =>
      [responses[0].defaultLanguageCode].concat(responses[0].supportedLanguageCodes),
    )
    .catch(err => {
      console.error('Failed to retrieve agent info:', err);
    });

const convertTrainingPhrase = (phrase, parameters) => {
  const variables = phrase.match(/\$\w+/);
  variables.forEach(variable => {
    const variableName = variable.replace(/^\$/, '');
    const parameter = parameters[variableName];
    const entity = parameter.entity;
    phrase = phrase.replace(variable, `${entity}:${variableName}`);
  });
  return {
    parts: [{ type: 'TEMPLATE', text: phrase }],
  };
};

const parseTrainingPhrase = phrase => {
  switch (phrase.type) {
    case 'EXAMPLE':
      return phrase.parts.map(part => {
        if (part.entityType && part.alias) return `$${part.alias}`;
        return part.text
      }).join('');
    case 'TEMPLATE':
      return phrase.parts.map(part => part.text.replace(/@[\w.]+:/g, '$')).join('');
  }
};

const remoteToLocal = (intents, language) => {
  const result = {};
  intents.forEach(intent => {
    result[intent.displayName] = {
      events: intent.events,
      isFallback: intent.isFallback,
      phrases: {
        [language]: intent.trainingPhrases.map(parseTrainingPhrase),
      },
      contexts: intent.inputContextNames.map(context => context.split('/').pop()),
      parameters: intent.parameters.map(parameter => ({
        name: parameter.displayName,
        entity: parameter.entityTypeDisplayName,
        required: parameter.mandatory
      }))
    };
  });
  return result;
};

const localToRemote = (name, intent) => ({
  displayName: name,
  webhookState: 'WEBHOOK_STATE_ENABLED',
  events: intent.events,
  isFallback: intent.isFallback,
  trainingPhrases: intent.phrases.map(phrase => convertTrainingPhrase(phrase, intent.parameters)),
});

const deleteIfExists = (displayName, remoteIntents) => {
  const remoteIntent = remoteIntents.find(intent => intent.displayName === displayName);

  if (remoteIntent) return deleteIntent(intent.id).then(() => true);

  return Promise.resolve(false);
};

(async function main() {
  if (mode === 'down') {
    const languages = await getLanguages();

    const remoteIntents = await Promise.all(languages.map(getRemoteIntents));

    let intents = {};
    languages.forEach((language, index) => {
      _.merge(intents, remoteToLocal(remoteIntents[index], language));
    });

    fs.writeFileSync(intentsFile, JSON.stringify(intents));
    console.log(`Done syncing down. Intents written to ${intentsFile}.`);
  }

  if (mode === 'up') {
    const localIntents = require(intentsFile);
    let updateCount = 0;
  
    const languages = await getLanguages();
  
    const remoteIntents = await getRemoteIntents(languages[0]);
  
    Promise.all(
      Object.keys(localIntents).map(displayName => {
        return deleteIfExists(displayName, remoteIntents).then(existed => {
          if (existed) updateCount++;
          const intent = localIntents[displayName];
          return intentsClient.createIntent(localToRemote(displayName, intent));
        });
      }),
    ).then(() => {
      console.log(
        `Done syncing up. ${updateCount} intents updated, ${localIntents.length -
          updateCount} intents created.`,
      );
    });
  }
})();
