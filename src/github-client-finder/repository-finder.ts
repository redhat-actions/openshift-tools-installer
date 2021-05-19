import * as semver from "semver";
import * as ghCore from "@actions/core";
import * as github from "@actions/github";

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
 * Find available versions from the github releases
 * @returns list of the available versions for the provided client
 */
export async function findAvailableVersionFromGithub(client: InstallableClient):
    Promise<string[]> {
    const githubRepositoryPath = ClientDetailOverrides[client]?.github?.repoSlug;
    assertDefined(githubRepositoryPath);
    const slashIndex = githubRepositoryPath.indexOf("/");
    const owner = githubRepositoryPath.substring(0, slashIndex);
    const repo = githubRepositoryPath.substring(slashIndex + 1);

    // using github token to avoid api rate limit hit
    const octokit = github.getOctokit(getPat());
    let releaseListresponse;

    // API Documentation: https://docs.github.com/en/rest/reference/repos#list-releases
    // Octokit Documenation: https://octokit.github.io/rest.js/v18#repos-list-releases
    try {
        releaseListresponse = await octokit.rest.repos.listReleases({
            owner,
            repo,
        });
    }
    catch (err) {
        throw getBetterHttpError(err);
    }

    const availableVersions: string[] = releaseListresponse.data.map(
        (versionData: Release) => versionData.tag_name
    );
    return availableVersions;
}

/**
 * Find all the release assets for the provided version of the client
 * @returns names of the asset found in the release
 */
export async function getReleaseAssets(client: InstallableClient, clientVersion: string):
    Promise<string[]> {
    const githubRepositoryPath = ClientDetailOverrides[client]?.github?.repoSlug;
    assertDefined(githubRepositoryPath);

    const slashIndex = githubRepositoryPath.indexOf("/");
    const owner = githubRepositoryPath.substring(0, slashIndex);
    const repo = githubRepositoryPath.substring(slashIndex + 1);

    const octokit = github.getOctokit(getPat());
    let releaseResponse;

    // API Documentation: https://docs.github.com/en/rest/reference/repos#get-a-release-by-tag-name
    // Octokit Documentation: https://octokit.github.io/rest.js/v18#repos-get-release-by-tag
    try {
        releaseResponse = await octokit.rest.repos.getReleaseByTag({
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
 * @returns Github personal access token provided by the user
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
