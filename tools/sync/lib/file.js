const fsx = require('node-fs-extra');
const fs = require('fs');
// const defaults = require('./defaults');

// const hasLocalProjectFolders = async () => {
//   return fs.existsSync(defaults.entitiesDir) && fs.existsSync(defaults.intentsDir);
// };

const writeObjectKeysAsFiles = (object, outputDir, callback) => {
  Object.keys(object).forEach(key => {
    const fileName = `${key}.json`;
    if (callback) {
      // callback can use filename and data for optional logging
      callback(fileName, object[key]);
    }
    fsx.outputFileSync(`${outputDir}/${fileName}`, JSON.stringify(object[key], null, 2));
  });
};

const getFileNamesInDir = (directory, limitToNames) =>
  new Promise((resolve, reject) => {
    if (!fs.existsSync(directory)) {
      resolve([]);
    } else {
      const files = [];
      try {
        fs.readdirSync(directory).forEach(file => files.push(file));
      } catch (e) {
        // eslint-disable-next-line
        reject(`Error reading from ${directory}`);
      }

      resolve(
        files
          .filter(fileName => (limitToNames ? limitToNames.includes(fileName) : true))
          .filter(fileName => fileName !== '.DS_Store'),
      );
    }
  });

const readJsonFile = async jsonPath =>
  new Promise(resolve => {
    const fileData = fs.readFileSync(jsonPath);
    try {
      resolve(JSON.parse(fileData));
    } catch (e) {
      resolve({});
    }
  });

const readJsonFiles = async (filesPath, fileNames) =>
  Promise.all(fileNames.map(fileName => readJsonFile(`${filesPath}/${fileName}`)));

const getCredentials = async (projectId, directory) => {
  const keyFileNames = await getFileNamesInDir(directory);
  const fileContents = await Promise.all(
    keyFileNames.map(fileName => readJsonFile(`${directory}/${fileName}`)),
  );

  return fileContents.find(result => result.project_id === projectId);
};

/**
 * Reads a list of json files and stores the contents for each with the filename (without .json) as key.
 * @param directory
 * @returns {Promise<void>}
 */
const parseJsonFilesIntoObject = async directory => {
  const fileNames = (await getFileNamesInDir(directory)).filter(name => name.endsWith('.json'));

  const result = {};

  const filesContents = await readJsonFiles(directory, fileNames);

  // todo reduce
  filesContents.forEach((content, index) => {
    const key = fileNames[index].replace('.json', '');
    result[key] = content;
  });

  return result;
};

/**
 * Reads all files in the given path and returns an array with all data.
 * @param directory
 * @param limitToFiles
 * @returns {Promise<*>}
 */
const readLocalIntentData = async (directory, limitToFiles) => {
  // get and read all files in path
  const fileNames = await getFileNamesInDir(directory, limitToFiles);
  if (fileNames.length === 0) {
    return [];
  }
  const filesContents = await readJsonFiles(directory, fileNames);

  // combine everything into 1 data-object
  return fileNames.map((fileName, i) => ({
    fileName,
    displayName: fileName.replace('.json', ''),
    fileContent: filesContents[i],
  }));
};

const getAvailableFileName = async (name, dir) => {
  const split = name.split('.');
  const ext = split.pop();
  const noExt = split.join();

  const getName = i => `${noExt}${i === 0 ? '' : ` (${i})`}.${ext}`;

  const files = await getFileNamesInDir(dir);
  let count = 0;
  while (files.indexOf(getName(count)) > -1) count++;

  return getName(count);
};

const getDateFileName = async (dir, prefix) => {
  const date = new Date();
  const hours = date
    .getHours()
    .toString()
    .padStart(2, '0');
  const minutes = date
    .getMinutes()
    .toString()
    .padStart(2, '0');

  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  const dateString = `${date.getFullYear()}-${month}-${day}`;
  const name = `${prefix || ''}${dateString} ${hours}-${minutes}.zip`;

  return getAvailableFileName(name, dir || '.');
};

module.exports = {
  getDateFileName,
  readLocalIntentData,
  readJsonFiles,
  parseJsonFilesIntoObject,
  getCredentials,
  getFileNamesInDir,
  writeObjectKeysAsFiles,
};
