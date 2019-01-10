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

colors.setTheme({
  info: 'green',
  warn: 'yellow',
  debug: 'blue',
  error: 'red',
});

const localOutputPath = path.resolve(__dirname, '../../config/dialogflow-agent');

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
  const projectId = argv._[0];
  const mode = argv._[1];

  const keyFilePath = './keys';
  const credentials = await fileUtils.getCredentials(projectId, keyFilePath);

  if (!credentials) {
    console.log(`Cannot find credentials for project '${projectId}' in ${keyFilePath}`.error);
    process.exit(1);
  }
  return;
  const languages = await miscUtils.getLanguagesInProject(credentials);
  switch (mode) {
    case 'up': {
      // intents before entities, because pushing intents will add incorrect entities (with the current order, the entities-push will fix/overwrite these) todo fix this
      await intentUtils.pushLocalIntentsToRemote(credentials, localOutputPath);
      await entityUtils.pushLocalEntitiesToRemote(credentials, localOutputPath);
      console.log('\nSync up complete'.info);
      break;
    }
    case 'down': {
      await entityUtils.writeRemoteEntitiesToFiles(credentials, languages, localOutputPath);
      await intentUtils.writeRemoteIntentsToFiles(credentials, languages, localOutputPath);
      console.log('\nSync down complete, validating local files'.info);
      await validateUtils.validateLocalFiles(localOutputPath, languages);
      console.log('Done'.info);
      break;
    }
    case 'compare': {
      await compareUtils.compareAll(credentials, languages, localOutputPath);
      break;
    }
    case 'validate': {
      await validateUtils.validateLocalFiles(localOutputPath, languages);
      break;
    }
    case 'export': {
      const result = await new dialogflow.AgentsClient({ credentials }).exportAgent({
        parent: `projects/${projectId}`,
      });
      const fileName = await fileUtils.getDateFileName('.', 'export ');
      fs.writeFileSync(fileName, result[0].result.agentContent);
      console.log(`\nExport written to file '${fileName}'`.info);
      break;
    }
    case 'restore': {
      const restoreFile = argv._[2];
      if (!restoreFile) {
        console.log('No filename given'.error);
        return;
      }

      let fileData;
      try {
        fileData = fs.readFileSync(restoreFile);
      } catch (e) {
        console.log(`Could not read from ${restoreFile}`.error);
        return;
      }

      // prettier-ignore
      const confirm = await new Confirm(`Warning: This will overwrite ${projectId} with the contents of '${restoreFile}'. Do you want to continue?`.error).run();
      if (!confirm) {
        console.log('Quitting...'.debug);
        return;
      }

      await new dialogflow.AgentsClient({ credentials }).restoreAgent({
        parent: `projects/${projectId}`,
        agentContent: fileData,
      });
      console.log(`Project restored`.info);
      break;
    }
    default: {
      console.error(`Unknown mode ${mode}`);
    }
  }
})();
