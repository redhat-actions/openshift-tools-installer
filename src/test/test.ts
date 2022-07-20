import { Inputs } from "../generated/inputs-outputs";
import * as index from "../index";
import {
    ClientsToInstall, InstallableClient, SourceAndClients, MIRROR,
} from "../util/types";

/* eslint-disable no-console */

// this is used to fake the "with" section from a workflow that uses this action, so we can run the action locally.
// see npm run dev-test
type TestInput = { [key in Inputs]?: string };

const inputs: TestInput[] = [
    {
        source: "mirror",
        helm: "3",
        opm: "*",
        kam: "latest",
        kn: "0.17",
    },
    {
        source: "github",
        preflight: "latest",
        ko: "latest",
        "chart-verifier": "latest",
        yq: "3.4.1",
        kustomize: "4",
        kn: "latest",
        tkn: "*",
        s2i: "1",
        "operator-sdk": "1.6",
    },
];

async function test(input: TestInput): Promise<void> {
    const clientsToInstall: ClientsToInstall = {};
    let source = MIRROR;

    // transform the above object into the type that index.run expects
    Object.entries(input).forEach(([ key_, value ]) => {
        if (key_ === Inputs.SOURCE && value) {
            source = value;
        }
        else if (key_ !== Inputs.GITHUB_PAT && value) {
            const key = key_ as InstallableClient;
            clientsToInstall[key] = index.parseVersion(key, value);
        }
    });

    const sourceAndClient: SourceAndClients = { source, clientsToInstall };

    await index.run(sourceAndClient);
}

(async function runTest(): Promise<void> {
    // await Promise.all(inputs.map(test));

    // CHANGE ME
    await test(inputs[1]);
}())
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
