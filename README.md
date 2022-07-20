# OpenShift Tools Installer Action

[![CI Checks](https://github.com/redhat-actions/openshift-tools-installer/workflows/CI%20Checks/badge.svg)](https://github.com/redhat-actions/openshift-tools-installer/actions?query=workflow%3A%22CI+Checks%22)
[![Install from Mirror Example](https://github.com/redhat-actions/openshift-tools-installer/actions/workflows/example_mirror.yml/badge.svg)](https://github.com/redhat-actions/openshift-tools-installer/actions/workflows/example_mirror.yml)
[![Install from GitHub Example](https://github.com/redhat-actions/openshift-tools-installer/actions/workflows/example_github.yml/badge.svg)](https://github.com/redhat-actions/openshift-tools-installer/actions/workflows/example_github.yml)
[![Link checker](https://github.com/redhat-actions/openshift-tools-installer/actions/workflows/link_checker.yml/badge.svg)](https://github.com/redhat-actions/openshift-tools-installer/actions/workflows/link_checker.yml)

[![tag badge](https://img.shields.io/github/v/tag/redhat-actions/openshift-tools-installer)](https://github.com/redhat-actions/openshift-tools-installer/tags)
[![license badge](https://img.shields.io/github/license/redhat-actions/openshift-tools-installer)](./LICENSE)

**openshift-tools-installer** is a GitHub Action that downloads, installs and caches OpenShift and Kubernetes related CLI tools from the [OpenShift Mirror](https://mirror.openshift.com/pub/openshift-v4/clients/) or from GitHub Releases, allowing you to easily use these tools in your Action workflows.

- Leverages the Actions cache so subsequent downloads are lightning fast
- Supports all 3 major operating systems
- Effective on a GitHub runner, or a self-hosted runner
- Semver support allows total version flexibility

<a id="supported-tools"></a>

## Supported Tools

Below is the list of supported tools that can be installed from the [OpenShift Mirror](https://mirror.openshift.com/pub/openshift-v4/clients/) or from GitHub.

| Name | Description | OpenShift Mirror | GitHub | Supported OS
| ---- | ----------- | --------- | ---------- | ----- |
| [`crc`](https://github.com/code-ready/crc) | CodeReady Containers | ✔️ [crc](https://mirror.openshift.com/pub/openshift-v4/x86_64/clients/crc/) | ❌ | Linux & Windows
| [`crda`](https://github.com/fabric8-analytics/cli-tools) | CodeReady Dependency Analytics | ❌ | ✔️ [fabric8-analytics/cli-tools](https://github.com/fabric8-analytics/cli-tools/blob/main/docs/cli_README.md) | All
| [`helm`](https://github.com/helm/helm) | Helm | ✔️ [helm](https://mirror.openshift.com/pub/openshift-v4/x86_64/clients/helm) | ❌ | All
| [`kam`](https://github.com/redhat-developer/kam) | GitOps Application Manager | ✔️ [kam](https://mirror.openshift.com/pub/openshift-v4/clients/kam/) | ✔️ [redhat-developer/kam](https://github.com/redhat-developer/kam) | All
| [`kamel`](https://github.com/apache/camel-k) | Camel K | ✔️ [camel-k](https://mirror.openshift.com/pub/openshift-v4/x86_64/clients/camel-k) | ✔️ [apache/camel-k](https://github.com/apache/camel-k) | All
| [`kn`](https://github.com/knative/client)| Knative Client | ✔️ [serverless](https://mirror.openshift.com/pub/openshift-v4/x86_64/clients/serverless) | ✔️ [knative/client](https://github.com/knative/client) | All
| [`kustomize`](https://github.com/kubernetes-sigs/kustomize) | Kustomize | ❌ | ✔️ [kubernetes-sigs/kustomize](https://github.com/kubernetes-sigs/kustomize) | All
| [`oc`](https://github.com/openshift/oc) | OpenShift Client | ✔️ [v3](https://mirror.openshift.com/pub/openshift-v3/clients/) and [ocp (v4)](https://mirror.openshift.com/pub/openshift-v4/x86_64/clients/ocp/) | ❌ | All
| [`odo`](https://github.com/openshift/odo) | OpenShift Do | ✔️ [odo](https://mirror.openshift.com/pub/openshift-v4/x86_64/clients/odo/) | ❌ | All
| [`openshift-install`](https://github.com/openshift/installer) | OpenShift Installer | ✔️ [ocp](https://mirror.openshift.com/pub/openshift-v4/x86_64/clients/ocp/) | ❌ | Linux & macOS
| [`operator-sdk`](https://github.com/operator-framework/operator-sdk) | Operator SDK | ✔️ [operator-sdk ](https://mirror.openshift.com/pub/openshift-v4/clients/operator-sdk) | ✔️ [operator-framework/operator-sdk](https://github.com/operator-framework/operator-sdk) | Linux & macOS
| [`opm`](https://github.com/operator-framework/operator-registry) | Operator Package Manager | ✔️ [ocp](https://mirror.openshift.com/pub/openshift-v4/x86_64/clients/ocp/) | ✔️ [operator-framework/operator-registry](https://github.com/operator-framework/operator-registry) | All*️
| [`s2i`](https://github.com/openshift/source-to-image) | Source to Image| ❌ | ✔️ [openshift/source-to-image](https://github.com/openshift/source-to-image) | All
| [`tkn`](https://github.com/tektoncd/cli) | Tekton Pipelines Client | ✔️ [pipeline](https://mirror.openshift.com/pub/openshift-v4/x86_64/clients/pipeline) | ✔️ [tektoncd/cli](https://github.com/tektoncd/cli) | All
| [`yq`](https://github.com/mikefarah/yq) | yq | ❌ | ✔️ [mikefarah/yq](https://github.com/mikefarah/yq) | All
| [`chart-verifier`](https://github.com/redhat-certification/chart-verifier) | Chart Verifier | ❌ | ✔️ [redhat-certification/chart-verifier](https://github.com/redhat-certification/chart-verifier) | Linux
| [`ko`](https://github.com/google/ko) | ko | ❌ | ✔️ [google/ko](https://github.com/google/ko) | All
| [`preflight`](https://github.com/redhat-openshift-ecosystem/openshift-preflight) | preflight | ❌ | ✔️ [redhat-openshift-ecosystem/openshift-preflight](https://github.com/redhat-openshift-ecosystem/openshift-preflight) | Linux

> *️ For Mirror: OPM versions less than `4.6.17` are only available for Linux.<br>
> For GitHub: OPM versions less than `1.15.1` are only available for Linux. <br>
> Note that OPM versions on the OpenShift Mirror are versioned by the OCP version, not the OPM executable version. <br>
> Note that the chart verifier binaries are only available starting with version `1.4.1`

## Inputs
<!-- markdown-link-check-disable -->
| Input | Description | Default |
| ----- | ----------- | ------- |
| source | Source from which to download all tools in the step. Can be `github` or `mirror`. If you want to download tools from both sources, use two steps. | `mirror`
| github_pat | GitHub personal access token. This is required if the `source` input is `github`. It can be a personal access token, but it is easiest to use the built-in `${{ github.token }}` or `${{ secrets.GITHUB_TOKEN }}`. See [GitHub docs](https://docs.github.com/en/actions/reference/authentication-in-a-workflow#about-the-github_token-secret) for details about the built-in token. | `${{ github.token }}` |
| skip_cache | Set to `true` to skip caching of the downloaded executables. This will also skip fetching previously cached executables. | `false`
<!-- markdown-link-check-disable -->

The other inputs are just the names of the supported tools, exactly as listed above. The value for each input is a [semantic version](https://docs.npmjs.com/cli/v6/using-npm/semver#versions) or [range](https://docs.npmjs.com/cli/v6/using-npm/semver#ranges) for that tool. If the version given is a range, this action will install the **maximum** version that satisfies the range.

Version numbers must be **quoted**, so the yaml parser interprets them as strings.

The version can also be `"*"`, or `"latest"`, which are the same. This installs the latest release that is available on the selected source.

For a list of available versions of a given tool, follow the links in the [Supported Tools table](#supported-tools) for the selected source, and look at the versions available.

If an invalid version is specified, the action will not proceed with any installations.

If the requested version is valid but not available on the mirror, the action fails, but any tools that were found will still be installed and cached.

## Example

Here is an workflow step demonstrating some example version inputs.

Also see [the OpenShift Mirror example workflow](./.github/workflows/example_mirror.yml), and [the GitHub example workflow](./.github/workflows/example_github.yml).

Refer to the [semver documentation](https://docs.npmjs.com/cli/v6/using-npm/semver#versions). The action uses the `semver` package, so all syntax is supported.

```yaml
steps:
  - name: Install CLI tools from OpenShift Mirror
    uses: redhat-actions/openshift-tools-installer@v1
    with:

      # "mirror" is the default source, so this is optional.
      source: "mirror"

      # Installs the latest kam release.
      kam: "latest"

      # Installs the latest release of oc with the major version 3.
      # This is equivalent to "3.x" or "^3".
      oc: "3"

      # Installs the latest release of odo with the major version 2, and the minor version 0.
      # This would install odo 2.0.3, but not odo 2.1.0.
      odo: "2.0"

      # This exact version will install version 0.11.0 of Tekton, no other version.
      tkn: "0.11.0"

  - name: Install CLI tools from GitHub
    uses: redhat-actions/openshift-tools-installer@v1
    with:
      # Search through these projects' GitHub releases, instead of the OpenShift Mirror.
      # https://docs.github.com/en/actions/reference/authentication-in-a-workflow
      source: "github"

      # Using GitHub token from the github context
      github_pat: ${{ github.token }}

      kam: "latest"
      s2i: "1.2"
      tkn: "0.17"
```

## Outputs
The action has one output called `installed`, which is a JSON object that maps tool names (as above) to an object describing the version that was installed.

For example, after installing `oc` with the version range "4.3", the output object contains:
```js
{
    // ... other items omitted
    oc: {
        fromCache: true,
        installedPath: "/home/runner/work/_temp/openshift-bin/oc",
        url: "https://mirror.openshift.com/pub/openshift-v4/clients/ocp/4.3.40/openshift-client-linux-4.3.40.tar.gz",
        version: "4.3.40"
    }
}
```

If a CLI was not installed due to an error, it will be absent from this object. Check the action output and workflow summary for the error.

## Caching
The executables are cached after being download and extracted. The cache key is determined by the source, the tool name, and the actual version that was downloaded - not the range that was input.

This means that if a new version is released that satisfies the version range, the cached old version will be bypassed in favour of the new version which is then cached. The upgrade is done for you, so long as the version range allows it.

See the [actions/cache](https://github.com/actions/cache) repository for cache limits.

The cache can be disabled for the current action run by setting the `skip_cache` input to `true`.

### Caching on GHES

The Actions cache is not supported on GitHub Enterprise Server, as per [this issue](https://github.com/actions/cache/issues/505).

The cache is disabled in this action if you are using GitHub Enterprise Server.

## Troubleshooting

- If your installation is failing because the requested tool or version is not found:
  - Check if the requested tool is available on the provided OS.
  - Follow the links in the output to make sure the download exists, and check that your inputs match.

  If it does exist and the action doesn't find it, or if you believe it should exist but does not, then open a bug.
<!-- markdown-link-check-disable-next-line -->

- If you hit the API rate limit, refer [GitHub API rate limit docs](https://docs.github.com/en/rest/overview/resources-in-the-rest-api#rate-limiting).
