### Kiai VoiceAction Skeleton
Boilerplate and example code for using the Kiai VoiceAction Framework.

## sync tool
In order to use the sync tools, there should be a key-file with credentials for the project you want to interact with in the `tools/sync/keys` folder.

After that, you can run the sync script like so:
```sh
npm run sync PROJECT-ID MODE [RESTORE-FILE]
```
The PROJECT-ID is used to look up the correct key-file, and MODE can be one of the following:
  
 * __up__: pushes local json files to remote

 * __down__: writes the remote project to local json files (and runs validate command when done)
 * __compare__: shows differences between local & remote
 * __validate__: gives some reports on the local files
 * __export__: exports the project to a zip file
 * __restore__: restores the project from a zip file (3rd argument)

See [Kiai VoiceAction Framework](https://github.com/mediamonks/kiai).
