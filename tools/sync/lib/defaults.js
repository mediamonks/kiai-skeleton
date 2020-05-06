const path = require('path');

const localOutputBaseDir = path.resolve(__dirname, '../../../config/dialogflow-agent');
const keyFilesDir = path.resolve(__dirname, '../keys');
const entitiesDir = `${localOutputBaseDir}/entities`;
const intentsDir = `${localOutputBaseDir}/intents`;
const defaultEntityKind = 'KIND_MAP';
const languageDelimiter = ','; // used in json to separate languages in language-key
const intentPriorityMultiplier = 10000;
const intentPriorities = {
  // in local files we use these named keys for priority
  highest: 100 * intentPriorityMultiplier,
  high: 75 * intentPriorityMultiplier,
  normal: 50 * intentPriorityMultiplier,
  low: 25 * intentPriorityMultiplier,
  disabled: -1,
};

module.exports = {
  intentsDir,
  entitiesDir,
  keyFilesDir,
  intentPriorities,
  languageDelimiter,
  defaultEntityKind,
};
