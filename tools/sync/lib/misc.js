const dialogflow = require('dialogflow');

const wait = time => new Promise(resolve => setTimeout(resolve, time));

/**
 * Returns the available languages in the proved DialogFlow project
 * @param credentials
 * @returns {Promise<*[] | never>}
 */
const getLanguagesInProject = credentials => {
  const agentsClient = new dialogflow.AgentsClient({ credentials });
  const agentParent = agentsClient.projectPath(credentials.project_id);

  return agentsClient
    .getAgent({ parent: agentParent })
    .then(responses =>
      [responses[0].defaultLanguageCode].concat(responses[0].supportedLanguageCodes),
    )
    .catch(err => {
      console.error('Failed to retrieve agent info:', err);
    });
};

const uniqueArray = array => array.filter((req, i, self) => self.indexOf(req) === i);

/**
 * Generates a list of local files, and adds a '*' if it exists remotely ('+' if it doesn't)
 * @param localData
 * @param remoteIntents
 * @returns {*}
 */
const getIntentsListForLocalFiles = (localData, remoteIntents) =>
  localData
    .map(
      localEntry =>
        ` ${
          remoteIntents.find(intent => intent.displayName === localEntry.displayName) ? '*' : '+'
          } ${localEntry.displayName}`,
    )
    .join('\n');

/**
 * Returns a list of readable differences between two arrays
 * @param array1
 * @param array2
 * @param elementName
 * @param array1Name
 * @param array2Name
 * @returns {Array}
 */
const compareArrays = (
  array1,
  array2,
  elementName,
  array1Name,
  array2Name,
  mayBeOkCheck,
  skipCheck,
) => {
  const results = [];
  [array1, array2].forEach((array, index) => {
    array.forEach(element => {
      const otherArray = index === 0 ? array2 : array1;
      const otherName = index === 0 ? array2Name : array1Name;
      const currentName = index === 0 ? array1Name : array2Name;
      if (otherArray.indexOf(element) === -1) {
        if (skipCheck && skipCheck(currentName, otherName, element)) {
          return;
        }

        const probablyFineMessage =
          mayBeOkCheck && mayBeOkCheck(currentName, otherName, element) ? '(may be ok)' : '';
        const res = `${elementName} '${element}' in ${currentName} does not exist in ${otherName} ${probablyFineMessage}`;
        if (results.indexOf(res) === -1) results.push(res);
      }
    });
  });
  return results;
};

module.exports = {
  wait,
  compareArrays,
  getIntentsListForLocalFiles,
  uniqueArray,
  getLanguagesInProject,
};
