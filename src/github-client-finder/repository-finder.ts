import * as semver from "semver";
import * as ghCore from "@actions/core";
import { Octokit } from "@octokit/core";
import { paginateRest } from "@octokit/plugin-paginate-rest";

import { components } from "@octokit/openapi-types/dist-types/index";
import { ClientDetailOverrides, InstallableClient } from "../util/types";
import { findMatchingVersion } from "../util/version-utils";
import {
    getBetterHttpError, assertDefined,
} from "../util/utils";
import { Inputs } from "../generated/inputs-outputs";

type Release = components["schemas"]["release"];
type ReleaseAsset = components["schemas"]["release-asset"];

let pat: string | undefined;

export async function findClientVersionFromGithub(client: InstallableClient, desiredVersionRange: semver.Range):
    Promise<string> {
    const availableVersions = await findAvailableVersionFromGithub(client);
    const clientMatchedVersion = findMatchingVersion(client, availableVersions, desiredVersionRange);

    return clientMatchedVersion;
}

/**
 * Find available versions from the GitHub releases
 * @returns list of the available versions for the provided client
 */
export async function findAvailableVersionFromGithub(client: InstallableClient):
    Promise<string[]> {
    const githubRepositoryPath = ClientDetailOverrides[client]?.github?.repoSlug;
    assertDefined(githubRepositoryPath);
    const slashIndex = githubRepositoryPath.indexOf("/");
    const owner = githubRepositoryPath.substring(0, slashIndex);
    const repo = githubRepositoryPath.substring(slashIndex + 1);

    // using GitHub token to avoid api rate limit hit
    const ActionsOctokit = Octokit.plugin(paginateRest);
    const octokit = new ActionsOctokit({ auth: getPat() });
    let releaseListresponse;

    // API Documentation: https://docs.github.com/en/rest/reference/repos#list-releases
    // Octokit Documenation: https://octokit.github.io/rest.js/v18#repos-list-releases
    // For pagination: https://github.com/octokit/plugin-paginate-rest.js/
    try {
        releaseListresponse = await octokit.paginate("GET /repos/{owner}/{repo}/releases", {
            owner,
            repo,
        });
    }
    catch (err) {
        throw getBetterHttpError(err);
    }

    let availableVersions: string[] = releaseListresponse.map(
        (versionData: Release) => versionData.tag_name
    );

    // filter the tags that start only with 'kustomize/'
    // Since this https://github.com/kubernetes-sigs/kustomize/tags contains few other tags too
    if (client === Inputs.KUSTOMIZE) {
        availableVersions = availableVersions.reduce((filteredversions, version) => {
            const VERSION_PREFIX = `${Inputs.KUSTOMIZE}/`;
            if (version.startsWith(VERSION_PREFIX)) {
                // trim prefix 'kustomize/'
                filteredversions.push(version.substring(VERSION_PREFIX.length));
            }

            return filteredversions;
        }, new Array<string>());
    }

    return availableVersions;
}

/**
 * Find all the release assets for the provided version of the client
 * @returns names of the asset found in the release
 */
export async function getReleaseAssets(client: InstallableClient, clientVersion: string):
    Promise<string[]> {
    const githubRepositoryPath = ClientDetailOverrides[client]?.github?.repoSlug;
    ghCore.info(`Download path of ${client} is https://github.com/${githubRepositoryPath}/releases`);
    assertDefined(githubRepositoryPath);

    const slashIndex = githubRepositoryPath.indexOf("/");
    const owner = githubRepositoryPath.substring(0, slashIndex);
    const repo = githubRepositoryPath.substring(slashIndex + 1);

    const octokit = new Octokit({ auth: getPat() });
    let releaseResponse;

    // API Documentation: https://docs.github.com/en/rest/reference/repos#get-a-release-by-tag-name
    // Octokit Documentation: https://octokit.github.io/rest.js/v18#repos-get-release-by-tag
    try {
        releaseResponse = await octokit.request("GET /repos/{owner}/{repo}/releases/tags/{tag}", {
            owner,
            repo,
            tag: clientVersion,
        });
    }
    catch (err) {
        throw getBetterHttpError(err);
    }

    const releaseAssets: string[] = releaseResponse.data.assets.map(
        (asset: ReleaseAsset) => asset.name
    );
    return releaseAssets;
}

/**
 *
 * @returns GitHub personal access token provided by the user.
 * If no PAT is provided, returns the empty string.
 */
function getPat(): string {
    if (pat == null) {
        pat = ghCore.getInput(Inputs.GITHUB_PAT);

        // this to only solve the problem of local development
        if (!pat && process.env.GITHUB_TOKEN) {
            pat = process.env.GITHUB_TOKEN;
        }
    }
    return pat;
}
