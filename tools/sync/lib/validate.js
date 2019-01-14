const fileUtils = require('./file');
const miscUtils = require('./misc');
const defaults = require('./defaults');
const flowsInCode = require('../../../index').flows;

/**
 * Gives some reports on a local json object representing the entities
 * @param basePath
 * @param languagesInProject
 */
// const validateLocalEntities = async languagesInProject => {
//   const fileNames = await fileUtils.getFileNamesInDir(defaults.entitiesDir);
//   const fileContents = await fileUtils.readJsonFiles(defaults.entitiesDir, fileNames);
//
//   fileContents.forEach((entity, index) => {
//     const entityName = fileNames[index].replace('.json', '');
//     Object.keys(entity).forEach(entityEntryKey => {
//       const entityEntry = entity[entityEntryKey]; // for example "jaguar"
//       const usedLanguagesForEntry = [];
//       Object.keys(entityEntry).forEach(languageKey => {
//         const split = languageKey.split(defaults.languageDelimiter);
//         usedLanguagesForEntry.push(...split);
//       });
//
//       if (usedLanguagesForEntry.length < languagesInProject.length) {
//         // this does not necessarily have to be wrong
//         // prettier-ignore
//         console.log(`Not all languages (${languagesInProject.join(',')}) were defined in ${entityName}:${entityEntryKey} (has only ${usedLanguagesForEntry.join(',')})`.warn);
//       } else if (usedLanguagesForEntry.length > languagesInProject.length) {
//         // this should not happen (combining of languages went wrong)
//         // prettier-ignore
//         console.log(`A language has been defined more than once for ${entityName}:${entityEntryKey} (${usedLanguagesForEntry.join(',')})`.warn);
//       }
//     });
//   });
// };

const createContextId = (flowName, context, method) =>
  (context ? [flowName, context, method] : [flowName, method]).join(':');

/**
 * Creates a list of entries in the local files
 * @returns {*}
 */
const getHandlersInIntentFiles = async () => {
  const fileData = await fileUtils.parseJsonFilesIntoObject(defaults.intentsDir);

  // these are kiai-specific handlers, so we dont look for them in the flows
  const skipHandlers = [
    'confirmation:confirmation:no',
    'confirmation:confirmation:yes',
    'permission:permission_confirmation:confirmation',
  ];

  return Object.keys(fileData).reduce((acc, fileName) => {
    const intent = fileData[fileName];
    const splitFileName = fileName.split('_');

    const kiaiDefaultIntentNames = ['login'];
    if (kiaiDefaultIntentNames.includes(fileName)) {
      return acc;
    }
    if (splitFileName.length !== 2) {
      console.error(`Unexpected format of intent name: ${fileName}`.error);
    } else {
      const [flowName, method] = splitFileName;
      let handler;
      if (intent.contexts.length === 0) {
        handler = createContextId(flowName, null, method);
      } else {
        intent.contexts.forEach(context => {
          handler = createContextId(flowName, context, method);
        });
      }
      if (!skipHandlers.includes(handler)) {
        acc.push(handler);
      }
    }

    return acc;
  }, []);
};

const getHandlersInCode = () => {
  const results = [];

  if (!flowsInCode) {
    console.error('Flows in code NOT found, please fix this reference'.error);
    return results;
  }

  const ignoreFlowProps = ['globalMethods'];

  Object.keys(flowsInCode).forEach(flowName => {
    const flow = flowsInCode[flowName];
    Object.keys(flow).forEach(flowProp => {
      if (ignoreFlowProps.includes(flowProp)) return;

      if (typeof flow[flowProp] === 'object') {
        Object.keys(flow[flowProp]).forEach(methodInContext => {
          if (typeof flow[flowProp][methodInContext] === 'function') {
            results.push(createContextId(flowName, flowProp, methodInContext));
          } else {
            // prettier-ignore
            console.error(`Property '${methodInContext}' in context '${flowProp}' in flow '${flowName}' is not a function`.error);
          }
        });
      } else {
        results.push(createContextId(flowName, null, flowProp));
      }
    });
  });

  return results;
};

const validateLocalFiles = async () => {
  const handlersInIntents = await getHandlersInIntentFiles();
  const handlersInCode = getHandlersInCode();

  const contextResults = miscUtils.compareArrays(
    handlersInIntents,
    handlersInCode,
    'handler',
    'intents',
    'code',
    null,
    // this method skips checks for handlers in code without context (so: a method directly on the root of a flow object),
    // so it is ok when they have no counterpart in an intent. The other way around (does such a handler exist in code when
    // we find one in an intent) is still happening.
    (currentName, otherName, element) => currentName === 'code' && element.split(':').length === 2,
  );

  console.log(`Comparing intent handlers in code with local intents`.debug);
  console.log(contextResults.join('\n').warn);

  // await validateLocalEntities(basePath, languagesInProject); todo can we skip this with new validation above?
};

module.exports = {
  validateLocalFiles,
};
