# openshift-tools-installer Changelog

## v3.1

### Bug Fixes
- Fix 3-minute hang after action completion on Node 20+ by restoring `keepAlive: false` on the HTTP client [#174](https://github.com/redhat-actions/openshift-tools-installer/pull/174)

## v3.0

### Breaking Changes
- Removed `kam` client — the [redhat-developer/kam](https://github.com/redhat-developer/kam) project is abandoned (last release Oct 2023) [#169](https://github.com/redhat-actions/openshift-tools-installer/pull/169)
- Switched `kamel` and `operator-sdk` to GitHub-only sources — the OpenShift mirror versions are significantly behind upstream. Using `source: mirror` with these clients will now produce an error [#170](https://github.com/redhat-actions/openshift-tools-installer/pull/170)
- Switched `tkn` from the stale v4 clients mirror to the [CGW pipelines mirror](https://mirror.openshift.com/pub/cgw/pipelines/) — versions prior to 1.15.4 are no longer available via mirror [#161](https://github.com/redhat-actions/openshift-tools-installer/pull/161)

### Features
- Add `argocd` client from the [CGW openshift-gitops mirror](https://mirror.openshift.com/pub/cgw/openshift-gitops/) [#161](https://github.com/redhat-actions/openshift-tools-installer/pull/161)
- Add [Content Gateway (CGW) mirror](https://mirror.openshift.com/pub/cgw/helm/) support for Helm 4.x — users can now install Helm 4 with `helm: "4"` [#161](https://github.com/redhat-actions/openshift-tools-installer/pull/161)
- Support multiple mirror base URLs per client, enabling version resolution across both the v4 clients mirror and CGW [#161](https://github.com/redhat-actions/openshift-tools-installer/pull/161)

### Bug Fixes
- Fix `isHashMissing` check to short-circuit before fetching hash files — previously it only applied when no hash file existed in the directory, but CGW pipelines has an incompatible hash file format [#168](https://github.com/redhat-actions/openshift-tools-installer/pull/168)
- Fix js-yaml CVE-2026-59870 via npm override [#167](https://github.com/redhat-actions/openshift-tools-installer/pull/167)
- Fix octokit openapi-types 28.x type compatibility [#167](https://github.com/redhat-actions/openshift-tools-installer/pull/167)
- Fix Dependabot PR CI failures [#156](https://github.com/redhat-actions/openshift-tools-installer/pull/156)
- Fix npm audit vulnerabilities and simplify security scan [#160](https://github.com/redhat-actions/openshift-tools-installer/pull/160)

### Dependencies
- Bump `@octokit/openapi-types` from 27.0.0 to 28.0.0 [#163](https://github.com/redhat-actions/openshift-tools-installer/pull/163)
- Bump `@octokit/plugin-paginate-rest` from 14.0.0 to 15.0.0 [#165](https://github.com/redhat-actions/openshift-tools-installer/pull/165)
- Bump `brace-expansion` to 5.0.8 and `js-yaml` to 5.2.2 [#151](https://github.com/redhat-actions/openshift-tools-installer/pull/151)
- Bump dev-dependencies group [#158](https://github.com/redhat-actions/openshift-tools-installer/pull/158)

## v2.0
- See [release notes](https://github.com/redhat-actions/openshift-tools-installer/releases/tag/v2.0)

## v1.13.1
- Apply custom filters to chart-verifier install requests [#109](https://github.com/redhat-actions/openshift-tools-installer/pull/109)

## v1.13
- Update action to run on Node20. https://github.blog/changelog/2023-09-22-github-actions-transitioning-from-node-16-to-node-20/
- Update @actions/http-client to 2.2.1
- Update code to support the new version of @actions/http-toolkit

## v1.12
- Update action/core dependency to 1.10.0

## v1.11
- Update action to run on Node16. https://github.blog/changelog/2022-05-20-actions-can-now-run-in-a-node-js-16-runtime/

## v1.10
- Add support for [OpenShift preflight](https://github.com/redhat-openshift-ecosystem/openshift-preflight)

## v1.9.2
- Fix odo installation on windows ans macOS. More details [here](https://github.com/redhat-actions/openshift-tools-installer/issues/75).

## v1.9.1
- Fix odo installation path. More details [here](https://github.com/redhat-actions/openshift-tools-installer/issues/66).

## v1.9
- Add support to install [ko](https://github.com/google/ko) from GitHub.

## v1.8.1
- Fix opm installation when source is GitHub. https://github.com/redhat-actions/openshift-tools-installer/issues/64

## v1.8
- Add support to install [Chart verifier](https://github.com/redhat-certification/chart-verifier) CLI from GitHub.

## v1.7.3
- Fix OpenShift Mirror redirect to the new OpenShift Mirror. https://github.com/redhat-actions/openshift-tools-installer/issues/58

## v1.7.2

## v1.7.1
- Improve log messages

## v1.7
- Add default value in the input `github_pat`.

## v1.6.3
- Small Readme edits

## v1.6.2
- Add pagination in fetching data from the GitHub APIs.

## v1.6.1
- Remove support to install CRC on macOS for version greater than or equal to `1.28.0`. For details see https://github.com/redhat-actions/openshift-tools-installer/issues/39

## v1.6
- Add support to install [CRDA cli](https://github.com/fabric8-analytics/cli-tools/blob/main/docs/cli_README.md) from GitHub.

## v1.5
- Add support to install [kustomize](https://github.com/kubernetes-sigs/kustomize) from GitHub.
- Fail the action if the requested tool is not available on the provided source.

## v1.4
- Change storage path of the downloaded tools to `/_temp/openshift-bin/<downloaded-tool>`.

## v1.3
- Add support to install [yq](https://github.com/mikefarah/yq) from GitHub.

## v1.2
- Add support to install tools from GitHub Releases. This can be done by specifying the desired source in the input `source`.
- Add input `source` which accepts value `github` and `mirror` to support tools installation from the OpenShift Mirror or from the GitHub.
- Add input `github_pat` to provide GitHub access token when source is `github`.
- Add support to install `s2i` client from GitHub Release.
- Add input `skip_cache` to set caching of the downloaded executables via action input instead of setting up the env.
- (Internal) Expand test workflows.

## v1.1.2
- Fix cache env bug check
- Auto-skip cache on GitHub Enterprise Server

## v1.1.1
Fix cache bug on GitHub Enterprise Server

## v1.1
Add support for `operator-sdk`

## v1
Initial Release
