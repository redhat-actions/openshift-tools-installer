

import * as index from "../index";
import { ClientsToInstall, InstallableClient } from "../util/types";

// this is used to fake the "with" section from a workflow that uses this action, so we can run the action locally.
// see npm run dev-test
type TestInput = { [key in InstallableClient]?: string };

const inputs: TestInput[] = [
    {
        crc: "*"
    },
    {
        kamel: "1",
        tkn: "v0.13.1",
        oc: "4",
        // "openshift-install": "4.x",
        odo: "latest",
        helm: "3",
        kn: "0.17",
    },
    // {
    //     tkn: "0.11",
    //     oc: "4",
    //     odo: "1",
    //     helm: "3.3",
    //     kn: "latest"
    // }
];

async function test(input: TestInput) {
    const clientsToInstall: ClientsToInstall = {};

    // transform the above object into the type that index.run expects
    Object.entries(input).forEach(([ key_, value ]) => {
        if (value) {
            const key = key_ as InstallableClient;
            clientsToInstall[key] = index.parseVersion(key, value);
        }
    });

    await index.run(clientsToInstall);
}

(async function() {
    // await Promise.all(inputs.map(test));

    // CHANGE ME
    await test(inputs[1]);
})()
.catch((err) => {
    console.error(err);
    process.exit(1);
});
