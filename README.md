# OpenShift CLI Installer Action

[![CI Checks](https://github.com/redhat-actions/openshift-cli-installer/workflows/CI%20Checks/badge.svg)](https://github.com/redhat-actions/openshift-cli-installer/actions?query=workflow%3A%22CI+Checks%22)
[![Example Workflow](https://github.com/redhat-actions/openshift-cli-installer/workflows/Example%20Workflow/badge.svg)](https://github.com/redhat-actions/openshift-cli-installer/actions?query=workflow%3A%22Example+Workflow%22)

[![tag badge](https://img.shields.io/github/v/tag/redhat-actions/openshift-cli-installer)](https://github.com/redhat-actions/openshift-cli-installer/tags)
[![license badge](https://img.shields.io/github/license/redhat-actions/openshift-cli-installer)](./LICENSE)

This is a GitHub Action that downloads and installs client CLIs from [mirror.openshift.com](https://mirror.openshift.com/pub/openshift-v4/clients/), allowing you to easily use these tools in your Action workflows.

- Supports all 3 major operating systems
- Effective on a GitHub runner, or a self-hosted runner
- Leverages the Actions cache so subsequent downloads are lightning fast
- Semver support allows total version flexibility

## Supported CLIs

| CLI Name | Directory | Notes |
| -------- | --------- | ----- |
| [`crc`](https://github.com/code-ready/crc)     | [crc](https://mirror.openshift.com/pub/openshift-v4/x86_64/clients/crc/) | crc is much larger than the other CLIs, at 2.5GB.
| [`helm`](https://github.com/helm/helm)  | [helm](https://mirror.openshift.com/pub/openshift-v4/x86_64/clients/helm) | v3 only.
| [`kam`](https://github.com/redhat-developer/kam) | [kam](https://mirror.openshift.com/pub/openshift-v4/clients/kam/) |
| [`kamel`](https://github.com/apache/camel-k)   | [camel-k](https://mirror.openshift.com/pub/openshift-v4/x86_64/clients/camel-k) |
| [`kn`](https://github.com/knative/client)| [serverless](https://mirror.openshift.com/pub/openshift-v4/x86_64/clients/serverless) |
| [`oc`](https://github.com/openshift/oc) | [v3](https://mirror.openshift.com/pub/openshift-v3/clients/) and [ocp](https://mirror.openshift.com/pub/openshift-v4/x86_64/clients/ocp/) | `oc` v3 and v4 are served from different directories.
| [`odo`](https://github.com/openshift/odo) | [odo](https://mirror.openshift.com/pub/openshift-v4/x86_64/clients/odo/) |
| [`openshift-installer`](https://github.com/openshift/installer) | [ocp](https://mirror.openshift.com/pub/openshift-v4/x86_64/clients/ocp/) | Not available for Windows.
| [`opm`](https://docs.openshift.com/container-platform/4.6/cli_reference/opm-cli.html)     | [opm](https://mirror.openshift.com/pub/openshift-v4/x86_64/clients/opm/) | Only available for Linux.
| [`tkn`](https://github.com/tektoncd/cli) | [pipeline](https://mirror.openshift.com/pub/openshift-v4/x86_64/clients/pipeline) |

## Inputs

The action inputs are just the names of the support CLIs, exactly as listed above. The value for each input is a [semantic version](https://docs.npmjs.com/cli/v6/using-npm/semver#versions) or [range](https://docs.npmjs.com/cli/v6/using-npm/semver#ranges) for that CLI. If the version given is a range, this action will install the **maximum** version that satisfies the range.

The version can also be `"*"`, or `"latest"`, which are the same. This installs the latest production release that is available on the mirror.

For a list of available versions of a given CLI, follow the **Directory** links in the table above, and look at the versions available.

If an invalid version is specified, the action will not proceed with any installations.

If the requested version is valid but not available on the mirror, the action fails, but any CLIs that were found will still be installed and cached.

## Example

Here is an workflow step demonstrating some common version inputs. Also see [the example workflow](./.github/workflows/example.yml).

Version numbers must be quoted so the yaml parser interprets them as strings.

Refer to the [semver documentation](https://docs.npmjs.com/cli/v6/using-npm/semver#versions). The action uses the `semver` package, so all syntax is supported.

```yaml
steps:
  - name: Install CLIs
    uses: redhat-actions/openshift-cli-installer@v1
    with:
      # Installs the latest camel-k release.
      kamel: latest

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
The action has one output called `installed`, which is a JSON object that maps CLI names (as above) to an object describing the version that was installed.

For example, after installing `oc` with the version range "4.3", the output object contains:
```js
{
    // ... other CLIs omitted
    oc: {
        fromCache: true,
        installedPath: "/home/runner/work/openshift-cli-installer/openshift-cli-installer/openshift-bin/oc",
        url: "https://mirror.openshift.com/pub/openshift-v4/clients/ocp/4.3.40/openshift-client-linux-4.3.40.tar.gz",
        version: "4.3.40"
    }
}
```

If a CLI was not installed due to an error, it will be absent from this object. Check the action output and workflow summary for the error.

## Caching
The executables are cached after being download and extracted. The cache key is determined by the CLI and the actual version that was downloaded - not the range that was input.

This means that if a new version is released that satisfies the version range, the cached old version will be bypassed in favour of the new version which is then cached. The upgrade is done for you, so long as the version range allows it.

See the [actions/cache](https://github.com/actions/cache) repository for cache limits.
