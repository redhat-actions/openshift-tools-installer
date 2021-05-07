# OpenShift Tools Installer Action

[![CI Checks](https://github.com/redhat-actions/openshift-tools-installer/workflows/CI%20Checks/badge.svg)](https://github.com/redhat-actions/openshift-tools-installer/actions?query=workflow%3A%22CI+Checks%22)
[![Example Workflow](https://github.com/redhat-actions/openshift-tools-installer/workflows/Example%20Workflow/badge.svg)](https://github.com/redhat-actions/openshift-tools-installer/actions?query=workflow%3A%22Example+Workflow%22)
[![Link checker](https://github.com/redhat-actions/openshift-tools-installer/actions/workflows/link_checker.yml/badge.svg)](https://github.com/redhat-actions/openshift-tools-installer/actions/workflows/link_checker.yml)

[![tag badge](https://img.shields.io/github/v/tag/redhat-actions/openshift-tools-installer)](https://github.com/redhat-actions/openshift-tools-installer/tags)
[![license badge](https://img.shields.io/github/license/redhat-actions/openshift-tools-installer)](./LICENSE)

**openshift-tools-installer** is a GitHub Action that downloads and installs OpenShift/Kubernetes client CLIs from [mirror.openshift.com](https://mirror.openshift.com/pub/openshift-v4/clients/), allowing you to easily use these tools in your Action workflows.

- Leverages the Actions cache so subsequent downloads are lightning fast
- Supports all 3 major operating systems
- Effective on a GitHub runner, or a self-hosted runner
- Semver support allows total version flexibility

## Supported Tools

| Name | Description | Directory |
| ---- | ----------- | --------- |
| [`crc`](https://github.com/code-ready/crc) | CodeReady Containers | [crc](https://mirror.openshift.com/pub/openshift-v4/x86_64/clients/crc/)
| [`helm`](https://github.com/helm/helm) | Helm | [helm](https://mirror.openshift.com/pub/openshift-v4/x86_64/clients/helm)
| [`kam`](https://github.com/redhat-developer/kam) | GitOps Application Manager | [kam](https://mirror.openshift.com/pub/openshift-v4/clients/kam/)
| [`kamel`](https://github.com/apache/camel-k) | Camel K| [camel-k](https://mirror.openshift.com/pub/openshift-v4/x86_64/clients/camel-k)
| [`kn`](https://github.com/knative/client)| Knative Client | [serverless](https://mirror.openshift.com/pub/openshift-v4/x86_64/clients/serverless)
| [`oc`](https://github.com/openshift/oc) | OpenShift Client | [v3](https://mirror.openshift.com/pub/openshift-v3/clients/) and [ocp (v4)](https://mirror.openshift.com/pub/openshift-v4/x86_64/clients/ocp/)
| [`odo`](https://github.com/openshift/odo) | OpenShift Do | [odo](https://mirror.openshift.com/pub/openshift-v4/x86_64/clients/odo/)
| [`openshift-installer`](https://github.com/openshift/installer) | OpenShift Installer | [ocp](https://mirror.openshift.com/pub/openshift-v4/x86_64/clients/ocp/)
| [`operator-sdk`](https://github.com/operator-framework/operator-sdk) | Operator SDK | [operator-sdk ](https://mirror.openshift.com/pub/openshift-v4/clients/operator-sdk)
| [`opm`](https://docs.openshift.com/container-platform/4.6/cli_reference/opm-cli.html) | Operator Package Manager | [ocp](https://mirror.openshift.com/pub/openshift-v4/x86_64/clients/ocp/)
| [`tkn`](https://github.com/tektoncd/cli) | Tekton Pipelines Client | [pipeline](https://mirror.openshift.com/pub/openshift-v4/x86_64/clients/pipeline)

## Inputs

The action inputs are just the names of the supported tools, exactly as listed above. The value for each input is a [semantic version](https://docs.npmjs.com/cli/v6/using-npm/semver#versions) or [range](https://docs.npmjs.com/cli/v6/using-npm/semver#ranges) for that tool. If the version given is a range, this action will install the **maximum** version that satisfies the range.

The version can also be `"*"`, or `"latest"`, which are the same. This installs the latest production release that is available on the mirror.

For a list of available versions of a given tool, follow the **Directory** links in the table above, and look at the versions available.

If an invalid version is specified, the action will not proceed with any installations.

If the requested version is valid but not available on the mirror, the action fails, but any tools that were found will still be installed and cached.

## Example

Here is an workflow step demonstrating some common version inputs. Also see [the example workflow](./.github/workflows/example.yml).

Version numbers must be quoted so the yaml parser interprets them as strings.

Refer to the [semver documentation](https://docs.npmjs.com/cli/v6/using-npm/semver#versions). The action uses the `semver` package, so all syntax is supported.

```yaml
steps:
  - name: Install CLI tools
    uses: redhat-actions/openshift-tools-installer@v1
    with:
      # Installs the latest kam release.
      kam: latest

      # Installs the latest release of oc with the major version 3.
      # This is equivalent to "3.x" or "^3".
      oc: "3"

      # Installs the latest release of odo with the major version 2, and the minor version 0.
      # This would install odo 2.0.3, but not odo 2.1.0.
      odo: "2.0"

      # This exact version will install version 0.11.0 of Tekton, no other version.
      tkn: "0.11.0"
```

## Outputs
The action has one output called `installed`, which is a JSON object that maps tool names (as above) to an object describing the version that was installed.

For example, after installing `oc` with the version range "4.3", the output object contains:
```js
{
    // ... other items omitted
    oc: {
        fromCache: true,
        installedPath: "/home/runner/work/openshift-tools-installer/openshift-tools-installer/openshift-bin/oc",
        url: "https://mirror.openshift.com/pub/openshift-v4/clients/ocp/4.3.40/openshift-client-linux-4.3.40.tar.gz",
        version: "4.3.40"
    }
}
```

If a CLI was not installed due to an error, it will be absent from this object. Check the action output and workflow summary for the error.

## Caching
The executables are cached after being download and extracted. The cache key is determined by the tool name and the actual version that was downloaded - not the range that was input.

This means that if a new version is released that satisfies the version range, the cached old version will be bypassed in favour of the new version which is then cached. The upgrade is done for you, so long as the version range allows it.

See the [actions/cache](https://github.com/actions/cache) repository for cache limits.

### Caching on GHES

The Actions cache is not supported on GitHub Enterprise Server, as per [this issue](https://github.com/actions/cache/issues/505).

The cache can be disabled by setting `CLI_INSTALLER_SKIP_CACHE=true` in the environment.

## Troubleshooting
Note that `openshift-install` is not available for Windows. All other tools are available for the 3 major platforms.

If your installation is failing because the requested tool or version is not found, follow the links in the output to make sure the download exists, and check that your inputs match.

If it does exist and the action doesn't find it, or if you believe it should exist but does not, then open a bug.
