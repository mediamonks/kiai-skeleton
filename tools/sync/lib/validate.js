const fileUtils = require('./file');
const miscUtils = require('./misc');
const defaults = require('./defaults');
const flowsInCode = require('../../../index').flows;

/**
 * Gives some reports on a local json object representing the entities
 * @param basePath
 * @param languagesInProject
 */
const validateLocalEntities = async languagesInProject => {
  const fileNames = await fileUtils.getFileNamesInDir(defaults.entitiesDir);
  const fileContents = await fileUtils.readJsonFiles(defaults.entitiesDir, fileNames);

  fileContents.forEach((entity, index) => {
    const entityName = fileNames[index].replace('.json', '');
    Object.keys(entity).forEach(entityEntryKey => {
      const entityEntry = entity[entityEntryKey]; // for example "jaguar"
      const usedLanguagesForEntry = [];
      Object.keys(entityEntry).forEach(languageKey => {
        const split = languageKey.split(defaults.languageDelimiter);
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

const createContextId = (flowName, context, method) => `${flowName}::${context}::${method}`;

/**
 * Creates a list of entries in the local files of format: flowName::context::method
 * @param intentFileNames
 * @param intentObjects
 * @returns {*}
 */
const getContextMethodsInIntentFiles = async () => {
  const intentFileNames = await fileUtils.getFileNamesInDir(defaults.intentsDir); // todo use parsejson method
  const intentObjects = await fileUtils.readJsonFiles(defaults.intentsDir, intentFileNames);

  return intentObjects.reduce((acc, intent, index) => {
    intent.contexts.forEach(context => {
      const fileWithoutExt = intentFileNames[index].replace('.json', '');
      const split = fileWithoutExt.split('_');
      if (split.length !== 2) {
        console.error(`Unexpected format of intent name: ${intentFileNames[index]}`.error);
        return;
      }
      const [flowName, method] = split;

      if (acc.indexOf(context) === -1) acc.push(createContextId(flowName, context, method));
    });

    return acc;
  }, []);
};

const getContextMethodsInCode = () => {
  const results = [];
  Object.keys(flowsInCode).forEach(flowName => {
    const flow = flowsInCode[flowName];
    Object.keys(flow).forEach(flowProp => {
      if (typeof flow[flowProp] === 'object') {
        Object.keys(flow[flowProp]).forEach(methodInContext => {
          if (typeof flow[flowProp][methodInContext] === 'function') {
            results.push(createContextId(flowName, flowProp, methodInContext));
          } else {
            // prettier-ignore
            console.error(`Property '${methodInContext}' in context '${flowProp}' in flow '${flowName}' is not a function`.error);
          }
        });
      }
    });
  });

  return results;
};

const validateLocalFiles = async () => {
  const contextMethodsInIntents = await getContextMethodsInIntentFiles();
  const contextMethodsInCode = getContextMethodsInCode();

  console.log(contextMethodsInIntents, contextMethodsInCode);
  const contextResults = miscUtils.compareArrays(
    contextMethodsInIntents,
    contextMethodsInCode,
    'handler',
    'intents',
    'code',
  );

  console.log(`Processing methods in contexts`.debug);
  console.log(contextResults.join('\n').warn);

  // await validateLocalEntities(basePath, languagesInProject); todo
};

module.exports = {
  validateLocalFiles,
};
