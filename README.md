### Kiai VoiceAction Skeleton

Boilerplate and example code for using the Kiai VoiceAction Framework.

#### Setting up Monkapps reverse tunnel for local dev

- https://wiki.mediamonks.net/Monkapps2
- See "Public URL for local machine"
- Skip step 5, dev-server.js takes care of this

#### Sync Dialogflow agent

In order to use the syncing tools, there should be a key-file with credentials for the project you want to interact with in the `tools/sync/keys` folder. Note that you can have more than one file (for multiple projects).

After that, you can run the sync script like so:

```sh
npm run sync PROJECT-ID OPERATION [RESTORE-FILE]
```

The `PROJECT-ID` is used to look up the correct key-file, and `OPERATION` can be one of the following:

- **down**: writes the remote project to local json files into `config/dialogflow-agent` (and runs validate command when done)
- **up**: pushes local json files to remote
- **compare**: shows differences between local & remote
- **validate**: gives some reports on the local files
- **export**: exports the project to a zip file
- **restore**: restores the project from a zip file (3rd argument)

See [Kiai VoiceAction Framework](https://github.com/mediamonks/kiai).

#### Creating a proxy to your local server

- Ensure you are connected to the MediaMonks VPN.

- Create a project on Monkapps `<your_region>.dev.monkapps.com`
  Ensure the `name` and `region` are set correctly in `package.json`. ( The `name` should match the username of your Monkapps instance).

- Run the script using `yarn create:proxy` ( if you have not added your SSH key to the server, it will ask you for the SSH/SFTP password). This will copy the necessary NGINX configuration to the server that will allow you to make use of the proxy to your local machine.
