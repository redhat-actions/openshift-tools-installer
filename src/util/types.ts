import * as semver from "semver";

import { Inputs } from "../generated/inputs-outputs";

// https://devblogs.microsoft.com/typescript/announcing-typescript-4-1/#template-literal-types
// neat
export type InstallableClient = `${Inputs}`


export const ClientDetailOverrides: { [key in InstallableClient]?: {
    directoryName?: string;
    // executableName?: string;
}} = {
    kamel: {
        directoryName: "camel-k"
    },
    kn: {
        directoryName: "serverless",
    },
    "openshift-install": {
        directoryName: "ocp",
    },
    oc: {
        directoryName: "ocp"
    },
    tkn: {
        directoryName: "pipeline"
    }
};

export type ClientDirectory = Readonly<{
    client: InstallableClient,
    version: string,
    url: string
}>;

export type ClientFile = Readonly<{
    archiveFilename: string,
    archiveFileUrl: string,
    clientName: InstallableClient,
    // executable: string,
    directoryUrl: string,
    version: string,
    versionRange: semver.Range;
}>;
