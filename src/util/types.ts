import * as semver from "semver";
import { Inputs } from "../generated/inputs-outputs";

// https://www.typescriptlang.org/docs/handbook/utility-types.html#excludetype-excludedunion
export type InstallableClient = Exclude<`${Inputs}`, "source" | "github_pat">;

export type ClientsToInstall = { [key in InstallableClient]?: semver.Range };

/**
 * Store here any details for the client that do not match the "expected" values.
 * GithubRepositoryPath has the repository path of the respective client
 * For example, directoryName usually matches the executable name (the InstallableClient),
 * but if it doesn't, it's overridden here.
 * isHashMissingOn* stores boolean value that indicates if hash file is missing or not in mirror/github
 */
export const ClientDetailOverrides: { [key in InstallableClient]?: {
    mirrorDirectoryName?: string;
    githubRepositoryPath?: string;
    isHashMissingOnGithub?: boolean;
    isHashMissingOnMirror?: boolean;
    // executableName?: string;
}} = {
    kam: {
        mirrorDirectoryName: "kam",
        githubRepositoryPath: "redhat-developer/kam",
        isHashMissingOnGithub: true,
    },
    kamel: {
        mirrorDirectoryName: "camel-k",
        githubRepositoryPath: "apache/camel-k",
        isHashMissingOnGithub: true,
    },
    kn: {
        mirrorDirectoryName: "serverless",
        // There is no stable release present here https://github.com/knative/client/releases as of now.
    },
    "openshift-install": {
        mirrorDirectoryName: "ocp",
        // There is no stable release present here https://github.com/openshift/installer/releases as of now.
    },
    oc: {
        mirrorDirectoryName: "ocp",
        // There is no release with binaries present here https://github.com/openshift/oc as of now.
    },
    opm: {
        mirrorDirectoryName: "ocp",
        githubRepositoryPath: "operator-framework/operator-registry",
        isHashMissingOnGithub: true,
    },
    "operator-sdk": {
        mirrorDirectoryName: "operator-sdk",
        githubRepositoryPath: "operator-framework/operator-sdk",
        isHashMissingOnMirror: true,
    },
    s2i: {
        // Not available on openshift mirror as of now.
        githubRepositoryPath: "openshift/source-to-image",
        isHashMissingOnGithub: true,
    },
    tkn: {
        mirrorDirectoryName: "pipeline",
        githubRepositoryPath: "tektoncd/cli",
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
    readonly mirrorDirectoryUrl?: string,
    readonly version: string,
    readonly versionRange: semver.Range;
}

export interface MirrorClient extends ClientFile {
    mirrorDirectoryUrl: string
}

export interface InstallSuccessResult {
    readonly fromCache: boolean;        // true if the executable was fetched from the cache instead of being downloaded
    readonly installedPath: string;     // the path the executable now exists at
    readonly url: string;               // the url to the file the executable was originally downloaded from
    readonly version: string;           // the actual, exact version that was installed
}

export type SourceAndClients = {
    source: string;
    clientsToInstall: ClientsToInstall;
};
