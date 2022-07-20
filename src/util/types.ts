import * as semver from "semver";
import { Inputs } from "../generated/inputs-outputs";

export const MIRROR = "mirror";
export const GITHUB = "github";

enum InputsThatAreNotClients {
    SOURCE = "source",
    GITHUB_PAT = "github_pat",
    SKIP_CACHE = "skip_cache",
}

// https://www.typescriptlang.org/docs/handbook/utility-types.html#excludetype-excludedunion
export type InstallableClient = Exclude<`${Inputs}`, `${InputsThatAreNotClients}`>;

export type ClientsToInstall = { [key in InstallableClient]?: semver.Range };

/**
 * Store here any details for the client that do not match the "expected" values.
 * repoSlug has the repository path of the respective client. e.g. openshift/source-to-image
 * For example, directoryName usually matches the executable name (the InstallableClient),
 * but if it doesn't, it's overridden here.
 * isHashMissing stores boolean value that indicates if hash file is missing or not in mirror/github
 */
export const ClientDetailOverrides: { [key in InstallableClient]?: {
    mirror?: {
        directoryName: string;
        isHashMissing?: boolean;
    },
    github?: {
        repoSlug: string;
        isHashMissing?: boolean;
    }
}} = {
    crda: {
        github: {
            repoSlug: "fabric8-analytics/cli-tools",
        },
    },
    kam: {
        mirror: {
            directoryName: "kam",
        },
        github: {
            repoSlug: "redhat-developer/kam",
            isHashMissing: true,
        },
    },
    kamel: {
        mirror: {
            directoryName: "camel-k",
        },
        github: {
            repoSlug: "apache/camel-k",
            isHashMissing: true,
        },
    },
    kn: {
        mirror: {
            directoryName: "serverless",
        },
        github: {
            repoSlug: "knative/client",
        },
    },
    kustomize: {
        github: {
            repoSlug: "kubernetes-sigs/kustomize",
        },
    },
    "openshift-install": {
        mirror: {
            directoryName: "ocp",
        },
        // There is no stable release present here https://github.com/openshift/installer/releases as of now.
    },
    oc: {
        mirror: {
            directoryName: "ocp",
        },
        // There is no release with binaries present here https://github.com/openshift/oc as of now.
    },
    opm: {
        mirror: {
            directoryName: "ocp",
        },
        github: {
            repoSlug: "operator-framework/operator-registry",
            isHashMissing: true,
        },
    },
    "operator-sdk": {
        mirror: {
            directoryName: "operator-sdk",
            isHashMissing: true,
        },
        github: {
            repoSlug: "operator-framework/operator-sdk",
        },
    },
    s2i: {
        // Not available on openshift mirror as of now.
        github: {
            repoSlug: "openshift/source-to-image",
            isHashMissing: true,
        },
    },
    tkn: {
        mirror: {
            directoryName: "pipeline",
        },
        github: {
            repoSlug: "tektoncd/cli",
        },
    },
    yq: {
        // Not available on openshift mirror
        github: {
            repoSlug: "mikefarah/yq",
        },
    },
    "chart-verifier": {
        // Not available on openshift mirror
        github: {
            repoSlug: "redhat-certification/chart-verifier",
            isHashMissing: true,
        },
    },
    ko: {
        // Not available on openshift mirror
        github: {
            repoSlug: "google/ko",
        },
    },
    preflight: {
        // Not available on OpenShift mirror
        github: {
            repoSlug: "redhat-openshift-ecosystem/openshift-preflight",
            isHashMissing: true,
        },
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
    mirrorDirectoryUrl?: string,
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
