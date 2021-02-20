import * as semver from "semver";

import { Inputs } from "../generated/inputs-outputs";

// https://devblogs.microsoft.com/typescript/announcing-typescript-4-1/#template-literal-types
// neat
export type InstallableClient = `${Inputs}`;

export type ClientsToInstall = { [key in InstallableClient]?: semver.Range };

/**
 * Store here any details for the client that do not match the "expected" values.
 * For example, directoryName usually matches the executable name (the InstallableClient),
 * but if it doesn't, it's overridden here.
 */
export const ClientDetailOverrides: { [key in InstallableClient]?: {
    directoryName?: string;
    // executableName?: string;
}} = {
    kam: {
        directoryName: "kam",
    },
    kamel: {
        directoryName: "camel-k",
    },
    kn: {
        directoryName: "serverless",
    },
    "openshift-install": {
        directoryName: "ocp",
    },
    oc: {
        directoryName: "ocp",
    },
    tkn: {
        directoryName: "pipeline",
    },
};

export interface ClientDirectory {
    readonly client: InstallableClient,
    readonly version: string,
    readonly url: string
}

export interface ClientFile {
    readonly archiveFilename: string,
    readonly archiveFileUrl: string,
    readonly clientName: InstallableClient,
    readonly directoryUrl: string,
    readonly version: string,
    readonly versionRange: semver.Range;
}

export interface InstallSuccessResult {
    readonly fromCache: boolean;        // true if the executable was fetched from the cache instead of being downloaded
    readonly installedPath: string;     // the path the executable now exists at
    readonly url: string;               // the url to the file the executable was originally downloaded from
    readonly version: string;           // the actual, exact version that was installed
}
