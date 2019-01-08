const fsx = require('node-fs-extra');
const fs = require('fs');

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
    const files = [];
    try {
      fs.readdirSync(directory).forEach(file => files.push(file));
    } catch (e) {
      // eslint-disable-next-line
      reject(`Error reading from ${directory}`);
    }

    resolve(files.filter(fileName => (limitToNames ? limitToNames.includes(fileName) : true)));
  });

const readJsonFile = async jsonPath =>
  new Promise(resolve => {
    const fileData = fs.readFileSync(jsonPath);
    resolve(JSON.parse(fileData));
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
 * @param fileNames
 * @param filesPath
 * @returns {Promise<void>}
 */
const parseJsonFilesIntoObject = async (fileNames, filesPath) => {
  if (!fileNames.every(name => name.endsWith('.json'))) {
    throw new Error('Cannot proceed, can only process json files'); // to ensure unique keys in the result object
  }
  const result = {};

  const filesContents = await readJsonFiles(filesPath, fileNames);

  filesContents.forEach((content, index) => {
    const key = fileNames[index].replace('.json', '');
    result[key] = content;
  });

  return result;
};

/**
 * Reads all files in the given path and returns an array with all data.
 * @param intentsPath
 * @param limitToFiles
 * @returns {Promise<*>}
 */
const readLocalIntentData = async (intentsPath, limitToFiles) => {
  // get and read all files in path
  const fileNames = await getFileNamesInDir(intentsPath, limitToFiles);
  if (fileNames.length === 0) {
    return [];
  }
  const filesContents = await readJsonFiles(intentsPath, fileNames);

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
  readJsonFile,
  parseJsonFilesIntoObject,
  getCredentials,
  getFileNamesInDir,
  writeObjectKeysAsFiles,
};
