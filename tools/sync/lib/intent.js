const dialogflow = require('dialogflow');
const Confirm = require('prompt-confirm');
const path = require('path');
const columnify = require('columnify');
const fileUtils = require('./file');
const miscUtils = require('./misc');

const intentsDirectory = 'intents';

const prioMp = 10000;
const intentPriorities = {
  highest: 100 * prioMp,
  high: 75 * prioMp,
  normal: 50 * prioMp,
  low: 25 * prioMp,
  disabled: -1,
};

const parseTrainingPhrase = phrase => {
  if (phrase.type !== 'EXAMPLE') {
    throw new Error('Unknown phrase type', phrase.type);
  }

  return phrase.parts
    .map(part => {
      if (part.entityType && part.alias) {
        return `$${part.alias}`;
      }
      return part.text;
    })
    .join('');
};

const priorityValueToName = value =>
  Object.keys(intentPriorities).find(key => intentPriorities[key] === value);

const parseRemoteIntentsForLanguageToObject = (intents, language, destinationObject) => {
  intents.forEach(intent => {
    const phrases = intent.trainingPhrases.map(phrase =>
      parseTrainingPhrase(phrase, intent.parameters),
    );

    let prioName = priorityValueToName(intent.priority);

    if (!prioName) {
      // prettier-ignore
      console.log(`Unknown priority value: ${intent.priority} for intent ${intent.displayName} (${language}), setting it to 'normal'`.warn);
      prioName = 'normal';
    }

    if (!destinationObject[intent.displayName]) {
      destinationObject[intent.displayName] = {
        events: intent.events,
        isFallback: intent.isFallback,
        phrases: {}, // is set below
        parameters: {}, // is set below
        contexts: intent.inputContextNames.map(context => context.split('/').pop()),
        priority: prioName,
      };
    }
    // each language will add phrases
    destinationObject[intent.displayName].phrases[language] = miscUtils.uniqueArray(phrases); // fixes an issue with remote sentences that end up the same after parsing: "my number is *123*" and "my number is *1 2 3*"

    destinationObject[intent.displayName].parameters = intent.parameters.map(parameter => ({
      name: parameter.displayName,
      entity: parameter.entityTypeDisplayName,
      mandatory: parameter.mandatory,
    }));
  });
  return destinationObject;
};

const getRemoteIntentsForLanguage = (credentials, language, limitIntentNames) => {
  const intentsClient = new dialogflow.IntentsClient({ credentials });
  const projectAgentPath = intentsClient.projectAgentPath(credentials.project_id);

  return intentsClient
    .listIntents({
      parent: projectAgentPath,
      intentView: 'INTENT_VIEW_FULL',
      languageCode: language,
    })
    .then(response =>
      response[0].filter(
        intent => (limitIntentNames ? limitIntentNames.includes(intent.displayName) : true), // when limitIntentNames array is set, ONLY return those (for testing purposes)
      ),
    )
    .catch(err => {
      console.error('Failed to list intents:', err);
    });
};

const getRemoteIntentDataAsObject = async (credentials, languages, limitToIntentNames) => {
  // get a list of intents for each language (so remoteIntentsForLanguage[0] is for languages[0])
  const remoteIntentsForLanguage = await Promise.all(
    languages.map(language =>
      getRemoteIntentsForLanguage(credentials, language, limitToIntentNames),
    ),
  );

  // parse all languages into 1 object
  const intentsObject = {};
  remoteIntentsForLanguage.forEach((intentsForLanguage, i) => {
    parseRemoteIntentsForLanguageToObject(intentsForLanguage, languages[i], intentsObject);
  });

  return intentsObject;
};
/**
 *
 * @param projectId
 * @param languages
 * @param baseOutputPath
 * @param limitToIntentNames if supplied: only process intents with names that are in this list
 * @returns {Promise<void>}
 */
const writeRemoteIntentsToFiles = async (
  credentials,
  languages,
  baseOutputPath,
  limitToIntentNames,
) => {
  // prettier-ignore
  const limitLog = limitToIntentNames ? `Only processing ${limitToIntentNames.join(',')}` : '';
  console.log(`\n---- Retrieving intents for ${credentials.project_id} (${limitLog}) ----`.info);

  const intentsObject = await getRemoteIntentDataAsObject(
    credentials,
    languages,
    limitToIntentNames,
  );

  const logData = [];
  // write to separate files
  await fileUtils.writeObjectKeysAsFiles(
    intentsObject,
    `${path.resolve(__dirname, baseOutputPath)}/${intentsDirectory}`,
    (fileName, data) => {
      // prettier-ignore
      const phrasesInfo = Object.keys(data.phrases).map(key => `${key}:${data.phrases[key].length}`).join(',');
      logData.push({
        text: `* Writing to ${fileName}`,
        fallback: data.isFallback ? 'fallback' : '',
        phrases: phrasesInfo,
        contexts: data.contexts.join(','),
        events: data.events.join(','),
      });
    },
  );

  console.log(
    columnify(logData, {
      showHeaders: false,
    }).debug,
  );
};

const parseLocalTrainingPhrase = (phrase, parameters) => {
  const regex = /(?:^|\B)\$[\w-]+/gmu;
  const variables = phrase.match(regex);
  const textParts = phrase.split(regex);

  const parts = [];
  textParts.forEach((textPart, index) => {
    if (textPart) parts.push(textPart);
    if (variables && variables[index]) parts.push(variables[index]);
  });

  let formattedParts; // todo better name
  if (variables) {
    formattedParts = parts.map(part => {
      let param;
      if (variables.includes(part)) {
        param = parameters.find(p => p.name === part.replace('$', '')); // todo fix this
        if (!param) {
          // prettier-ignore
          console.error(`Stopping: variable '${part}' in phrase '${phrase}' is not defined in parameters.`.error);
          process.exit(1);
        }
      }

      return {
        text: part,
        entityType: param ? param.entity : undefined,
        alias: param ? param.name : undefined,
        userDefined: !!(param && param.entity), // set to true for every entity. this shouldn't really matter, from the docs: "Indicates whether the text was manually annotated by the developer."
      };
    });
  } else {
    formattedParts = [{ text: phrase }];
  }

  return {
    parts: formattedParts,
    type: 'EXAMPLE',
  };
};

const localIntentParametersToRemote = params => ({
  prompts: [],
  displayName: params.name,
  value: `$${params.name}`,
  defaultValue: '',
  entityTypeDisplayName: params.entity,
  mandatory: params.mandatory,
  // isList: false, todo
});

const localIntentToRemote = (displayName, fileContent, language, projectAgentPath, name) => {
  let priority = intentPriorities[fileContent.priority];

  if (!priority) {
    // prettier-ignore
    console.log(`Unknown priority '${fileContent.priority}' for intent ${displayName} (${language}), setting it to 'normal'`.warn);
    priority = intentPriorities.normal;
  }

  return {
    name, // can be undefined (when creating an intent we don't pass it to the method) but that is intended
    displayName,
    priority,
    webhookState: 'WEBHOOK_STATE_ENABLED',
    events: fileContent.events,
    isFallback: fileContent.isFallback,
    trainingPhrases: fileContent.phrases[language].map(phrase =>
      parseLocalTrainingPhrase(phrase, fileContent.parameters),
    ),
    parameters: fileContent.parameters.map(param => localIntentParametersToRemote(param)),
    inputContextNames: fileContent.contexts.map(
      context => `${projectAgentPath}/sessions/-/contexts/${context}`,
    ),
  };
};

/**
 * Push all intents from the data-object to remote
 * @param client
 * @param projectAgentPath
 * @param localData
 * @returns {Promise<any[]>}
 */
const pushIntents = async (client, projectAgentPath, localData) => {
  // since we can not create an intent without content, and we can only create 1 language at a time,
  // we pick one language (doesn't matter which) to create an intent first, then use that one to
  // update the other languages
  const languages = Object.keys(localData[0].fileContent.phrases);
  const createLanguage = languages[0];

  // prettier-ignore
  console.log(`Pushing ${localData.length} intent(s) (in languages: ${languages.join(', ')})`.debug);

  // create intents & store results, so we have the ids of the intents when we update with the other languages
  const createResults = await client
    .batchUpdateIntents({
      parent: projectAgentPath,
      languageCode: createLanguage,
      intentBatchInline: {
        intents: localData.map(entry =>
          localIntentToRemote(
            entry.displayName,
            entry.fileContent,
            createLanguage,
            projectAgentPath,
          ),
        ),
      },
    })
    .then(r => r[0].result.intents);

  await Promise.all(
    languages
      .filter(lang => lang !== createLanguage)
      .map(updateLanguage =>
        client.batchUpdateIntents({
          parent: projectAgentPath,
          languageCode: updateLanguage,
          intentBatchInline: {
            intents: localData.map((entry, i) =>
              localIntentToRemote(
                entry.displayName,
                entry.fileContent,
                updateLanguage,
                projectAgentPath,
                createResults[i].name, // acts as the id from the newly created intent
              ),
            ),
          },
        }),
      ),
  );
};

const getRemoteGlobalFallbackIntents = intents =>
  intents.filter(intent => intent.isFallback && intent.inputContextNames.length === 0);

/**
 *
 * @param localIntentsData array representing local data: {fileName: string, displayName: string, fileContent: (json-obj from file) }
 * @returns {*}
 */
const getLocalGlobalFallbackIntents = localIntentsData =>
  localIntentsData.filter(
    entry => entry.fileContent.contexts.length === 0 && entry.fileContent.isFallback,
  );

const validateGlobalFallbacks = (localData, remoteIntents) => {
  // todo this should be done not only for global fallbacks (= no contexts), but broader: there can not be more than 1 fallback for the same contexts combi
  // do some checks for multiple global (meaning: no context) fallbacks, both remote & local
  const remoteGlobalFallbacks = getRemoteGlobalFallbackIntents(remoteIntents);
  const localGlobalFallBacks = getLocalGlobalFallbackIntents(localData);

  if (remoteGlobalFallbacks.length === 0 && localGlobalFallBacks.length === 0) {
    return;
  }
  if (localGlobalFallBacks.length > 1) {
    // prettier-ignore
    console.log(`Quitting: more than one global fallback found locally: ${localGlobalFallBacks.map(entry => entry.displayName).join(', ')}`.error);
    process.exit(1);
  }
  if (remoteGlobalFallbacks.length > 1) {
    // this should not be possible, but lets check anyway
    // prettier-ignore
    console.log(`Quitting: more than one global fallback found remotely: ${remoteGlobalFallbacks.map(intent => intent.displayName)}`.error);
    process.exit(1);
  }

  if (localGlobalFallBacks.length === 1 && remoteGlobalFallbacks.length === 1) {
    const localGlobalFallBackName = localGlobalFallBacks[0].displayName;
    const remoteGlobalFallBackName = remoteGlobalFallbacks[0].displayName;
    if (localGlobalFallBackName !== remoteGlobalFallBackName) {
      // prettier-ignore
      console.error(`Quitting: about to push a global fallback (${localGlobalFallBackName}), while there is already a (different) global fallback on remote (${remoteGlobalFallBackName}) which is NOT listed to be overwritten`.error);
      process.exit(1);
    }
  }
};

/**
 * Reads all local files in the entities folder and pushes them to the given project
 * @param projectId
 * @param basePath Folder where DialogFlow data is located (should contain entities folder)
 * @param namePostFix Optional, will be appended to the all remote intent names
 * @param limitToFiles Optional, will only process the given list of file names: ['file1.json', 'file2.json']
 * @returns {Promise<void>}
 */
const pushLocalIntentsToRemote = async (credentials, basePath, limitToFiles) => {
  const limitLog = limitToFiles ? `(Only processing ${limitToFiles.join(',')})` : '';
  console.log(`\n---- Pushing local intents to ${credentials.project_id}. ${limitLog} ----`.info);
  const client = new dialogflow.IntentsClient({ credentials });
  const intentsPath = `${basePath}/${intentsDirectory}`;
  const projectAgentPath = client.projectAgentPath(credentials.project_id);

  const localData = await fileUtils.readLocalIntentData(intentsPath, limitToFiles);

  if (localData.length === 0) {
    console.log('No local files found, nothing to push'.debug);
    return;
  }

  // get remote intents
  const remoteIntents = await client.listIntents({ parent: projectAgentPath }).then(r => r[0]);
  const intentsToRemove = remoteIntents.filter(intent =>
    localData.find(entry => entry.displayName === intent.displayName),
  );

  // do some checks regarding global fallbacks (can quit process)
  validateGlobalFallbacks(localData, remoteIntents);

  // prettier-ignore
  console.log(`Found ${localData.length} local intents (* exists remotely, + will be added remotely): \n${miscUtils.getIntentsListForLocalFiles(localData, remoteIntents)}`.debug);

  if (intentsToRemove.length) {
    // prettier-ignore
    console.log(`WARNING: This will overwrite ${intentsToRemove.length} remote intent(s)`.warn);

    const confirm = await new Confirm('Do you want to continue?'.error).run();
    if (!confirm) {
      console.log('Quitting...'.debug);
      process.exit(1);
    }
    console.log(`Removing ${intentsToRemove.length} remote intent(s)...`.debug);

    await client.batchDeleteIntents({
      parent: projectAgentPath,
      intents: intentsToRemove.map(intent => ({ name: intent.name })),
    });
  }
  await miscUtils.wait(2000); // prevents an issue with "there is already a fallback intent for context X" (even while it has been deleted above) todo needs better fix
  await pushIntents(client, projectAgentPath, localData);
};

module.exports = {
  intentsDirectory,
  getRemoteIntentDataAsObject,
  writeRemoteIntentsToFiles,
  pushLocalIntentsToRemote,
};
