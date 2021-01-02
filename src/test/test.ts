

import * as index from "../index";
import { InstallableClient } from "../util/types";

(async function() {
    const input = {
        tkn: "v0.13.1",
        oc: "~4.1",
        odo: "latest",
        helm: "3",
        kn: "0.17",
    };

    const clientsToInstall: index.ClientsToInstall = {};

    Object.entries(input).forEach(([k_, v]) => {
        if (v) {
            const k = k_ as InstallableClient;
            clientsToInstall[k] = index.parseVersion(k, v);
        }
    });

    await index.run(clientsToInstall);
})()
.catch((err) => {
    console.error(err);
    process.exit(1);
});
