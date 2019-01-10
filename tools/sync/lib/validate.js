const fileUtils = require('./file');
const miscUtils = require('./misc');
const entityUtils = require('./entity');
const intentUtils = require('./intent');
const flowsInCode = require('../../../index').flows;

const localContexts = [];

/**
 * Gives some reports on a local json object representing the entities
 * @param basePath
 * @param languagesInProject
 */
const validateLocalEntities = async (basePath, languagesInProject) => {
  const entitiesPath = `${basePath}/${entityUtils.entitiesDirectory}/`;
  const fileNames = await fileUtils.getFileNamesInDir(entitiesPath);
  const fileContents = await fileUtils.readJsonFiles(entitiesPath, fileNames);

  fileContents.forEach((entity, index) => {
    const entityName = fileNames[index].replace('.json', '');
    Object.keys(entity).forEach(entityEntryKey => {
      const entityEntry = entity[entityEntryKey]; // for example "jaguar"
      const usedLanguagesForEntry = [];
      Object.keys(entityEntry).forEach(languageKey => {
        const split = languageKey.split(entityUtils.languageDelimiter);
        usedLanguagesForEntry.push(...split);
      });

      if (usedLanguagesForEntry.length < languagesInProject.length) {
        // this does not necessarily have to be wrong
        // prettier-ignore
        console.log(`Not all languages (${languagesInProject.join(',')}) were defined in ${entityName}:${entityEntryKey} (has only ${usedLanguagesForEntry.join(',')})`.warn);
      } else if (usedLanguagesForEntry.length > languagesInProject.length) {
        // this should not happen (combining of languages went wrong)
        // prettier-ignore
        console.log(`A language has been defined more than once for ${entityName}:${entityEntryKey} (${usedLanguagesForEntry.join(',')})`.warn);
      }
    });
  });
};

const validateLocalFiles = async (basePath, languagesInProject) => {
  const intentsDir = `${basePath}/${intentUtils.intentsDirectory}`;
  const intentFileNames = await fileUtils.getFileNamesInDir(intentsDir);
  const intentObjects = await fileUtils.readJsonFiles(intentsDir, intentFileNames);

  const defaultKiaiContextNames = ['confirmation', 'permission_confirmation']; // these are default contexts in the agent used by kiai (will not exists in local prj)
  const contexts = [...defaultKiaiContextNames, ...localContexts];

  // check contexts
  const contextsInIntents = intentObjects.reduce((acc, intent) => {
    intent.contexts.forEach(context => {
      if (acc.indexOf(context) === -1) acc.push(context);
    });

    return acc;
  }, []);
  const contextResults = miscUtils.compareArrays(
    contextsInIntents,
    contexts,
    'context',
    'intents',
    'code',
  );

  // check flownames
  const defaultKiaiFlowNames = ['confirmation', 'permission'];
  const flowNamesInCode = [...defaultKiaiFlowNames, ...Object.keys(flowsInCode)];
  const flowsInIntents = intentFileNames.reduce((acc, name) => {
    const split = name.split('_');
    if (split.length === 2) {
      // flow-names that cannot be properly split will be logged below, when processing methods
      acc.push(split[0]);
    }
    return acc;
  }, []);
  const flowResults = miscUtils.compareArrays(
    flowsInIntents,
    flowNamesInCode,
    'flowName',
    'intents',
    'code',
    (current, other) => current === 'code' && other === 'intents', // when this check is true, the case is not necessarily an issue
  );

  // display all
  const allResults = [
    { title: 'contexts', data: contextResults },
    { title: 'flows', data: flowResults },
  ];
  allResults.forEach(result => {
    console.log(`Processing ${result.title}`.debug);
    if (result.data.length) {
      console.log(result.data.join('\n').warn);
    }
  });

  // method names
  const defaultKiaiIntentNames = ['login'];
  console.log('Processing method-names in intents'.debug);
  intentFileNames
    .map(name => name.replace('.json', ''))
    .forEach((intentName, index) => {
      const split = intentName.split('_');
      if (split.length !== 2 && !defaultKiaiIntentNames.includes(intentName)) {
        console.log(`Intent name '${intentName}' is not of expected format`.warn);
      } else {
        const flowName = split[0];
        const methodName = split[1];
        const contextsInFile = intentObjects[index].contexts;

        contextsInFile.forEach(context => {
          const flowFile = flowsInCode[flowName];
          if (!flowFile) {
            // only report if this is not a name used by kiai itself
            if (!defaultKiaiFlowNames.includes(flowName)) {
              console.log(`Cannot find flow '${flowName}'`.warn);
            }
            return;
          }
          const contextInFile = flowFile[context];
          if (!contextInFile) {
            console.log(`Cannot find context '${context}' in flow '${flowName}'`.warn);
            return;
          }
          const method = contextInFile[methodName];
          if (!method) {
            // prettier-ignore
            console.log(`Cannot find method '${methodName}' for context '${context}' in flow '${flowName}'`.warn);
            return;
          }

          if (typeof method !== 'function') {
            // prettier-ignore
            console.log(`Entry '${methodName}' for context '${context}' in flow '${flowName}' is not a function`);
          }
        });
      }
    });

  console.log('Processing entities'.debug);
  await validateLocalEntities(basePath, languagesInProject);
};

module.exports = {
  validateLocalFiles,
};
