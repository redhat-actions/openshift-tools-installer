
import * as ghCore from "@actions/core";
import { Inputs } from './generated/inputs-outputs';

export async function run() {

    const clientsToInstall: { [key in Inputs]?: string } = {};

    for (const input of Object.values(Inputs)) {
        const clientVersion = ghCore.getInput(input);
        ghCore.info(`The version of ${input} to install is "${clientVersion}"`);

        if (clientVersion === "latest" || clientVersion === "") {
            clientsToInstall[input] = "latest";
        }
        else if (clientVersion != null) {
            clientsToInstall[input] = clientVersion;
        }
    }

    console.log("The clients to install are: ", clientsToInstall);
}

run()
.catch(ghCore.setFailed);
