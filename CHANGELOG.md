# openshift-tools-installer Changelog

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
