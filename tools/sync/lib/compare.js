const { diff } = require('deep-diff');
const fileUtils = require('./file');
const entityUtils = require('./entity');
const intentUtils = require('./intent');

const ucFirst = string => string.charAt(0).toUpperCase() + string.slice(1);

const showDifferences = (localData, remoteData, singularName) => {
  const diffs = diff(localData, remoteData);

  if (!diffs) {
    console.log(`Local and remote are equal`.debug);
  } else {
    // prettier-ignore
    console.log(`${diffs.length} differences found:`.debug);
    diffs.forEach(d => {
      let subject;
      if (d.path.length === 1) {
        subject = `${ucFirst(singularName)} '${d.path[0]}'`;
      } else {
        const prefix = d.kind === 'A' ? 'Array in path' : 'Path';
        subject = `${prefix} '${d.path.slice(1).join('.')}' in ${singularName} '${d.path[0]}'`;
      }
      switch (d.kind) {
        case 'D':
        case 'N': {
          // prettier-ignore
          console.log(`- ${subject} does not exist ${d.kind === 'D' ? 'remotely' : 'locally'}`.warn);
          break;
        }
        case 'E': {
          console.log(`- ${subject} is different. Local: ${d.lhs}, remote: ${d.rhs}`.warn);
          break;
        }
        case 'A': {
          // prettier-ignore
          console.log(`- ${subject} is different at index ${d.index}. Local: ${d.item.lhs}, remote: ${d.item.rhs}`.warn);
          break;
        }

        default: {
          console.log(`! Unhandled diff type: ${d.kind}`.error);
        }
      }
    });
  }
};

const getDataFromLocalFilesAsObject = async dir => {
  const fileNames = await fileUtils.getFileNamesInDir(dir);
  return fileUtils.parseJsonFilesIntoObject(fileNames, dir);
};

const compare = async (
  type,
  credentials,
  languages,
  basePath,
  appendPath,
  retrieveRemoteMethod,
) => {
  const localData = await getDataFromLocalFilesAsObject(`${basePath}/${appendPath}`);
  const remoteData = await retrieveRemoteMethod(credentials, languages);

  console.log(`\nComparing local ${type} with remote (${credentials.project_id})`.info);
  showDifferences(localData, remoteData, type === 'entities' ? 'entity' : 'intent');
};

const compareAll = async (credentials, languages, localOutputPath) => {
  await compare(
    'entities',
    credentials,
    languages,
    localOutputPath,
    entityUtils.entitiesDirectory,
    entityUtils.getRemoteEntityDataAsObject,
  );

  await compare(
    'intents',
    credentials,
    languages,
    localOutputPath,
    intentUtils.intentsDirectory,
    intentUtils.getRemoteIntentDataAsObject,
  );
};

module.exports = {
  compareAll,
};
