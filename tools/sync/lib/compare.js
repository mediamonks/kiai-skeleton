const { diff } = require('deep-diff');
const fileUtils = require('./file');
const entityUtils = require('./entity');
const intentUtils = require('./intent');
const defaults = require('./defaults');

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

const compare = async (type, credentials, languages, dir, retrieveRemoteMethod) => {
  console.log(`\nComparing local ${type} with remote (${credentials.project_id})`.info);

  const localData = await fileUtils.parseJsonFilesIntoObject(dir);
  if (Object.keys(localData).length === 0) {
    console.log(`\nNo local ${type} data found`.warn);
    return;
  }

  const remoteData = await retrieveRemoteMethod(credentials, languages);
  showDifferences(localData, remoteData, type === 'entities' ? 'entity' : 'intent');
};

const compareAll = async (credentials, languages) => {
  await compare(
    'entities',
    credentials,
    languages,
    defaults.entitiesDir,
    entityUtils.getRemoteEntityDataAsObject,
  );

  await compare(
    'intents',
    credentials,
    languages,
    defaults.intentsDir,
    intentUtils.getRemoteIntentDataAsObject,
  );
};

module.exports = {
  compareAll,
};
