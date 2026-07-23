import * as ghCore from "@actions/core";
import { Inputs } from "../generated/inputs-outputs";
import { InstallableClient } from "./types";

const SKIP_CACHE_ENVVAR = "CLI_INSTALLER_SKIP_CACHE";
const skipCache = ghCore.getInput(Inputs.SKIP_CACHE);

const skipCacheForInput = ghCore.getInput(Inputs.SKIP_CACHE_FOR);
const skipCacheForClients: Set<string> = new Set(
    skipCacheForInput ? skipCacheForInput.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean) : []
);

export function shouldUseCache(client?: InstallableClient): boolean {
    if (process.env[SKIP_CACHE_ENVVAR] === "true" || skipCache === "true") {
        ghCore.info(`⏩ ${skipCache === "true" ? `Input ${Inputs.SKIP_CACHE}` : `${SKIP_CACHE_ENVVAR}`} `
        + `is set; skipping cache.`);
        return false;
    }

    if (client && skipCacheForClients.has(client)) {
        ghCore.info(`⏩ ${client} is in ${Inputs.SKIP_CACHE_FOR} list; skipping cache.`);
        return false;
    }

    return true;
}
