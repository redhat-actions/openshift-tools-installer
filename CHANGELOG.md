# openshift-tools-installer Changelog

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
