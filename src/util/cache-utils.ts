import * as ghCore from "@actions/core";
import { Inputs } from "../generated/inputs-outputs";

const SKIP_CACHE_ENVVAR = "CLI_INSTALLER_SKIP_CACHE";
const skipCache = ghCore.getInput(Inputs.SKIP_CACHE);

export function shouldUseCache(): boolean {
    if (process.env[SKIP_CACHE_ENVVAR] === "true" || skipCache === "true") {
        ghCore.info(`⏩ ${skipCache === "true" ? `Input ${Inputs.SKIP_CACHE}` : `${SKIP_CACHE_ENVVAR}`} `
        + `is set; skipping cache.`);
        return false;
    }

    return true;
}
