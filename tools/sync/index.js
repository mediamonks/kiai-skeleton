const dialogflow = require('dialogflow');
const Confirm = require('prompt-confirm');
const fs = require('fs');
const colors = require('colors');
const path = require('path');
const argv = require('minimist')(process.argv.slice(2));
const intentUtils = require('./lib/intent');
const entityUtils = require('./lib/entity');
const miscUtils = require('./lib/misc');
const validateUtils = require('./lib/validate');
const fileUtils = require('./lib/file');
const compareUtils = require('./lib/compare');

const localOutputPath = path.resolve(__dirname, '../../config/dialogflow-agent');
const keyFilePath = path.resolve(__dirname, './keys');

colors.setTheme({
  info: 'green',
  warn: 'yellow',
  debug: 'blue',
  error: 'red',
});

const Operation = {
  SYNC_UP: 'up',
  SYNC_DOWN: 'down',
  COMPARE: 'compare',
  VALIDATE: 'validate',
  EXPORT: 'export',
  RESTORE: 'restore',
};

/**
 * use: node index.js PROJECT-NAME COMMAND [optional 3rd arg]
 * command can be:
 * - up
 *   Pushes local json files to remote
 *
 * - down
 *   Writes the remote project to local json files (and runs validate command when done)
 *
 * - compare
 *   Shows differences between local & remote
 *
 * - validate
 *   Gives some reports on the local files
 *
 * - export
 *   Exports the project to a zip file
 *
 * - restore
 *   Restores the project from a zip file (3rd argument)
 */
(async () => {
  const op = argv._[1];
  const projectId = argv._[0];

  if (!projectId) {
    console.error('No project id given'.error);
    process.exit(0);
  }

  const credentials = await fileUtils.getCredentials(projectId, keyFilePath);

  if (!credentials) {
    console.log(`Cannot find credentials for project '${projectId}' in ${keyFilePath}`.error);
    process.exit(0);
  }

  const needLanguages = ![Operation.RESTORE, Operation.EXPORT].includes(op);
  const languages = needLanguages ? await miscUtils.getLanguagesInProject(credentials) : null;

  const needLocalFiles = [Operation.SYNC_UP, Operation.VALIDATE, Operation.COMPARE].includes(op);
  if (needLocalFiles && !(await fileUtils.hasLocalProjectFolders(localOutputPath))) {
    console.error(`Cannot find local project files in ${localOutputPath}`.error);
    process.exit(0);
  }

  switch (op) {
    case Operation.SYNC_UP: {
      // intents before entities, because pushing intents will add incorrect entities (with the current order, the entities-push will fix/overwrite these) todo fix this
      await intentUtils.pushLocalIntentsToRemote(credentials, localOutputPath);
      await entityUtils.pushLocalEntitiesToRemote(credentials, localOutputPath);
      console.log('\nSync up complete'.info);
      break;
    }
    case Operation.SYNC_DOWN: {
      await entityUtils.writeRemoteEntitiesToFiles(credentials, languages, localOutputPath);
      await intentUtils.writeRemoteIntentsToFiles(credentials, languages, localOutputPath);
      console.log('\nSync down complete, validating local files'.info);
      await validateUtils.validateLocalFiles(localOutputPath, languages);
      console.log('Done'.info);
      break;
    }
    case Operation.COMPARE: {
      await compareUtils.compareAll(credentials, languages, localOutputPath);
      break;
    }
    case Operation.VALIDATE: {
      await validateUtils.validateLocalFiles(localOutputPath, languages);
      break;
    }
    case Operation.EXPORT: {
      const result = await new dialogflow.AgentsClient({ credentials }).exportAgent({
        parent: `projects/${projectId}`,
      });
      const fileName = await fileUtils.getDateFileName('.', 'export ');
      fs.writeFileSync(fileName, result[0].result.agentContent);
      console.log(`\nExport written to file '${fileName}'`.info);
      break;
    }
    case Operation.RESTORE: {
      const restoreFile = argv._[2];
      if (!restoreFile) {
        console.log('No filename given'.error);
        process.exit(0);
      }

      let fileData;
      try {
        fileData = fs.readFileSync(restoreFile);
      } catch (e) {
        console.log(`Could not read from ${restoreFile}`.error);
        process.exit(0);
      }

      // prettier-ignore
      const confirm = await new Confirm(`Warning: This will overwrite ${projectId} with the contents of '${restoreFile}'. Do you want to continue?`.error).run();
      if (!confirm) {
        console.log('Quitting...'.debug);
        process.exit(0);
      }

      await new dialogflow.AgentsClient({ credentials }).restoreAgent({
        parent: `projects/${projectId}`,
        agentContent: fileData,
      });
      console.log(`Project restored`.info);
      break;
    }
    default: {
      console.error(`Unknown operation ${op || ''}`.error);
    }
  }
})();
