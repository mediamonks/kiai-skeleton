const dialogflow = require('dialogflow');
const path = require('path');
const Confirm = require('prompt-confirm');
const fileUtils = require('./file');
const miscUtils = require('./misc');

const entitiesDirectory = 'entities';
const defaultEntityKind = 'KIND_MAP';
const languageDelimiter = ','; // used in json to separate languages in language-key

const getRemoteEntities = (credentials, language) => {
  const client = new dialogflow.EntityTypesClient({ credentials });
  const projectAgentPath = client.projectAgentPath(credentials.project_id);

  const results = {};
  return client
    .listEntityTypes({ parent: projectAgentPath, languageCode: language })
    .then(result => result[0])
    .then(entities => {
      entities.forEach(entity => {
        results[entity.displayName] = {};

        entity.entities.forEach(entityEntry => {
          results[entity.displayName][entityEntry.value] = entityEntry.synonyms;
        });
      });

      return results;
    });
};

const getRemoteEntityDataAsObject = async (credentials, languages) => {
  const resultData = {};
  await Promise.all(languages.map(language => getRemoteEntities(credentials, language))).then(
    results => {
      results.forEach((resultForLanguage, i) => {
        // loop through all entities for this language (for example "brand")

        Object.keys(resultForLanguage).forEach(entityKey => {
          if (!resultData[entityKey]) {
            resultData[entityKey] = {};
          }

          // loop through all entries for this entity (for example "jaguar")
          Object.keys(resultForLanguage[entityKey]).forEach(entityEntryKey => {
            if (!resultData[entityKey][entityEntryKey]) {
              resultData[entityKey][entityEntryKey] = {};
            }

            // set the list of synonyms for this language
            const language = languages[i];
            const synonyms = resultForLanguage[entityKey][entityEntryKey];
            const entityEntryObject = resultData[entityKey][entityEntryKey];

            // check if there is a language in there with the exact same synonyms
            const languageWithSameSynonyms = Object.keys(entityEntryObject).find(
              // todo synonyms in different order are not detected as being the same here
              localeKey =>
                JSON.stringify(entityEntryObject[localeKey]) === JSON.stringify(synonyms),
            );

            if (languageWithSameSynonyms) {
              // create new entry for both languages (separated by comma)
              entityEntryObject[
                `${languageWithSameSynonyms}${languageDelimiter}${language}`
              ] = synonyms;
              // and delete the old entry
              delete entityEntryObject[languageWithSameSynonyms];
            } else {
              entityEntryObject[language] = synonyms;
            }
          });
        });
      });
    },
  );

  return resultData;
};

const writeRemoteEntitiesToFiles = async (credentials, languages, baseOutputPath) => {
  console.log(`---- Retrieving entities for ${credentials.project_id} ----`.info);

  const resultData = await getRemoteEntityDataAsObject(credentials, languages);

  // write to separate files
  fileUtils.writeObjectKeysAsFiles(
    resultData,
    `${path.resolve(__dirname, baseOutputPath)}/${entitiesDirectory}`,
    (fileName, data) => {
      console.log(`* Writing ${Object.keys(data).length} entries to ${fileName}`.debug);
    },
  );
};

/**
 * Creates an array of EntityType.Entity items with a value and synonyms for that value
 * https://cloud.google.com/dialogflow-enterprise/docs/reference/rpc/google.cloud.dialogflow.v2beta1#google.cloud.dialogflow.v2beta1.EntityType.Entity
 * @param language
 * @param entitiesObject
 * @returns {{value: string, synonyms: Array}[]}
 */
const createEntityEntriesForLanguage = (language, entitiesObject) =>
  Object.keys(entitiesObject)
    .map(entityEntryKey => ({
      value: entityEntryKey,
      synonyms: Object.keys(entitiesObject[entityEntryKey]).reduce((acc, currentLocaleKey) => {
        // if the language-key contains the language we are looking for, add all synonyms
        if (currentLocaleKey.split(languageDelimiter).indexOf(language) > -1) {
          acc.push(...entitiesObject[entityEntryKey][currentLocaleKey]);
        }
        return acc;
      }, []),
    }))
    .filter(entityEntry => entityEntry.synonyms.length); // remove entries without synonyms (can happen because some may not be set for a language)

/**
 * Creates UpdateEntityTypeRequest objects for a given json file. Can be more than one,
 * because there can be more than 1 language in the json.
 *
 * https://cloud.google.com/dialogflow-enterprise/docs/reference/rpc/google.cloud.dialogflow.v2beta1#updateentitytyperequest
 * @param displayName
 * @param fileData
 * @param languages
 * @returns {Promise<any>}
 */
const getUpdateEntityTypeRequestForLocalFile = (name, displayName, fileData, language) => ({
  languageCode: language,
  entityType: {
    name,
    displayName,
    entities: createEntityEntriesForLanguage(language, fileData),
    kind: defaultEntityKind,
  },
});

const getCreateEntityTypeRequestForLocalFile = (agent, displayName, fileData, language) => ({
  languageCode: language,
  parent: agent,
  entityType: {
    displayName,
    entities: createEntityEntriesForLanguage(language, fileData),
    kind: defaultEntityKind,
  },
});

const updateEntity = async (client, id, name, data, language) => {
  console.log(`Updating entity '${name} (${language}) with id: ${id}`.debug);
  const request = getUpdateEntityTypeRequestForLocalFile(id, name, data, language);
  await client.updateEntityType(request);
};

const createEntity = async (client, agent, name, data, language) => {
  console.log(`Creating entity '${name} (${language})`.debug);
  const entity = await client
    .createEntityType(getCreateEntityTypeRequestForLocalFile(agent, name, data, language))
    .then(r => r[0]);
  console.log(`  (created with id ${entity.name})`.debug);
  return entity;
};

const getLanguagesInLocalFileContent = content =>
  Object.keys(content).reduce((acc, key) => {
    Object.keys(content[key]).forEach(languageKeyForEntry => {
      languageKeyForEntry.split(languageDelimiter).forEach(langKey => {
        if (acc.indexOf(langKey) === -1) acc.push(langKey);
      });
    });
    return acc;
  }, []);

// todo add comparing
// const getLanguagesInLocalFiles = async (filesPath, fileNames) => {
//   const fileContents = await fileUtils.readJsonFiles(filesPath, fileNames);
//
//   const results = fileContents.reduce((acc, content) => {
//     const languages = getLanguagesInLocalFileContent(content);
//     acc.push(...languages);
//     return acc;
//   }, []);
//
//   return miscUtils.uniqueArray(results);
// };

const pushLocalEntitiesToRemote = async (credentials, baseOutputPath) => {
  console.log(`---- Pushing entities to project ${credentials.project_id} ----`.info);
  const entitiesPath = `${baseOutputPath}/${entitiesDirectory}`;
  const client = new dialogflow.EntityTypesClient({ credentials });
  const agent = client.projectAgentPath(credentials.project_id);

  const localFileNames = await fileUtils.getFileNamesInDir(entitiesPath);
  const localFileContents = await fileUtils.readJsonFiles(entitiesPath, localFileNames);

  // get remote entities
  const remoteEntities = await client
    .listEntityTypes({ parent: agent })
    .then(results => results[0]);

  // put everything we need to know about local entities in list
  const localData = localFileNames.map((fileName, i) => {
    const name = fileName.replace('.json', '');
    const remote = remoteEntities.find(remoteEntity => remoteEntity.displayName === name);
    return {
      fileName,
      name,
      content: localFileContents[i],
      languages: getLanguagesInLocalFileContent(localFileContents[i]),
      remoteId: remote ? remote.name : undefined,
    };
  });

  // prettier-ignore
  console.log(
    `Found ${localData.length} local entities (* exists remotely, + will be added): ${localData.map(
      entry => `\n ${entry.remoteId ? '*' : '+'} ${entry.name}`,
    )}`.debug,
  );

  // confirm if entries will be overwritten
  const remotelyExistingEntries = localData.filter(entry => entry.remoteId);
  if (remotelyExistingEntries.length > 0) {
    // prettier-ignore
    console.log(`WARNING: This will overwrite ${remotelyExistingEntries.length} remote entities: ${remotelyExistingEntries.map(entry => entry.name).join(', ')}`.warn);

    const confirm = await new Confirm('Do you want to continue?'.error).run();
    if (!confirm) {
      console.log('Quitting...'.debug);
      process.exit(1);
    }
  }

  for (let i = 0; i < localData.length; i++) {
    const entry = localData[i];

    for (let l = 0; l < entry.languages.length; l++) {
      const language = entry.languages[l];

      // we ONLY create when entry does not exist remote AND we process the very first language. all other ones can be an update
      if (l === 0 && !entry.remoteId) {
        // eslint-disable-next-line
        const newEntity = await createEntity(client, agent, entry.name, entry.content, language);
        entry.remoteId = newEntity.name; // modify original data, so the next language (will be an update call) has the id
      } else {
        // eslint-disable-next-line
        await updateEntity(client, entry.remoteId, entry.name, entry.content, language);
      }
    }
  }
};

module.exports = {
  languageDelimiter,
  entitiesDirectory,
  getRemoteEntityDataAsObject,
  writeRemoteEntitiesToFiles,
  pushLocalEntitiesToRemote,
};
