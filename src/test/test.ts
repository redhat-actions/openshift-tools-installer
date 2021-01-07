

import * as index from "../index";
import { InstallableClient } from "../util/types";

type TestInput = { [key in InstallableClient]?: string };

const inputs: TestInput[] = [
    {
        crc: "*"
    },
    {
        kamel: "1",
        tkn: "v0.13.1",
        oc: "4",
        "openshift-install": "4.x",
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
    const clientsToInstall: index.ClientsToInstall = {};

    Object.entries(input).forEach(([ k_, v ]) => {
        if (v) {
            const k = k_ as InstallableClient;
            clientsToInstall[k] = index.parseVersion(k, v);
        }
    });

    await index.run(clientsToInstall);
}

(async function() {
    // await Promise.all(inputs.map(test));
    await test(inputs[0]);
})()
.catch((err) => {
    console.error(err);
    process.exit(1);
});
