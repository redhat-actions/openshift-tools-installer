import { Inputs } from "../generated/inputs-outputs";
import * as index from "../index";
import {
    ClientsToInstall, InstallableClient, SourceAndClients, Source,
} from "../util/types";

/* eslint-disable no-console */

// this is used to fake the "with" section from a workflow that uses this action, so we can run the action locally.
// see npm run dev-test
type TestInput = { [key in Inputs]?: string };

const inputs: TestInput[] = [
    {
        source: "mirror",
        crc: "*",
    },
    // {
    //     source: "mirror",
    //     opm: "*",
    //     kam: "latest",
    //     kamel: "1",
    //     tkn: "v0.13.1",
    //     oc: "4",
    //     // "openshift-install": "4.x",
    //     odo: "latest",
    //     "operator-sdk": "4.7",
    //     helm: "3",
    //     kn: "0.17",
    // },
    {
        source: "github",
        // odo: "latest",
        kn: "latest",
        // tkn: "latest",
        // s2i: "latest",
        // kam: "latest",
        // kamel: "latest",
        // opm: "latest",
        // "operator-sdk": "1.6.1",
    },
    // {
    //     tkn: "0.11",
    //     oc: "4",
    //     odo: "1",
    //     helm: "3.3",
    //     kn: "latest"
    // }
];

async function test(input: TestInput): Promise<void> {
    const clientsToInstall: ClientsToInstall = {};
    let source: Source = Source.MIRROR;

    // transform the above object into the type that index.run expects
    Object.entries(input).forEach(([ key_, value ]) => {
        if (key_ === Inputs.SOURCE) {
            source = value as Source;
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
