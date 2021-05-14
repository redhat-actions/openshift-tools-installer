// This file was auto-generated by action-io-generator. Do not edit by hand!
export enum Inputs {
    /**
     * crc - CodeReady Containers.
     * Required: false
     * Default: None.
     */
    CRC = "crc",
    /**
     * Github personal access token.
     * This is required if tools need to be installed from GitHub.
     * This will be used to access GitHub API's, as authenticated API calls have more quota to hit api rate limit.
     * Required: false
     * Default: None.
     */
    GITHUB_PAT = "github_pat",
    /**
     * Helm - The Kubernetes package manager.
     * Required: false
     * Default: None.
     */
    HELM = "helm",
    /**
     * kam - GitOps Application Manager.
     * Required: false
     * Default: None.
     */
    KAM = "kam",
    /**
     * Camel K - Kubernetes serverless integration framework.
     * Required: false
     * Default: None.
     */
    KAMEL = "kamel",
    /**
     * Knative - Deploy and manage serverless workloads.
     * Required: false
     * Default: None.
     */
    KN = "kn",
    /**
     * oc - The OpenShift Client.
     * Required: false
     * Default: None.
     */
    OC = "oc",
    /**
     * odo - OpenShift Do is for developers writing and deploying applications.
     * Required: false
     * Default: None.
     */
    ODO = "odo",
    /**
     * openshift-install - Install an OpenShift 4 cluster.
     * Required: false
     * Default: None.
     */
    OPENSHIFT_INSTALL = "openshift-install",
    /**
     * operator-sdk - Framework to work with Operators SDK.
     * Required: false
     * Default: None.
     */
    OPERATOR_SDK = "operator-sdk",
    /**
     * opm - Create and maintain catalogs of Operators.
     * Required: false
     * Default: None.
     */
    OPM = "opm",
    /**
     * s2i - Toolkit and workflow for building reproducible container images from source code.
     * Required: false
     * Default: None.
     */
    S2I = "s2i",
    /**
     * Source from which to download the tool, accepted values are 'github' or 'mirror'
     * Required: false
     * Default: "mirror"
     */
    SOURCE = "source",
    /**
     * The client for interacting with Tekton pipelines.
     * Required: false
     * Default: None.
     */
    TKN = "tkn",
}

export enum Outputs {
    /**
     * JSON object describing the versions that were installed.
     * Required: false
     * Default: None.
     */
    INSTALLED = "installed",
}
