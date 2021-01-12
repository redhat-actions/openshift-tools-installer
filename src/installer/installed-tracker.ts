import * as ghCore from "@actions/core";
import * as path from "path";
import * as fs from "fs";
import { InstallableClient, InstallResult, InstallSuccessOutput } from "../util/types";
import { getExecutablesTargetDir } from "../util/utils";

export async function writeOutInstalledFile(installed: string): Promise<void> {
    const installedFilePath = await getInstalledFilePath();
    await fs.promises.writeFile(installedFilePath, installed);
    ghCore.info(`Wrote out installed versions to ${installedFilePath}`);
}

let installFileExists: boolean | undefined;
let installFileParsed: InstallSuccessOutput | undefined;
export async function checkIsInstalled(client: InstallableClient, version: string): Promise<InstallResult | undefined> {
    const installFilePath = await getInstalledFilePath();

    if (installFileExists == null) {
        try {
            await fs.promises.access(installFilePath);
            installFileExists = true;
        }
        catch (err) {
            installFileExists = false;
        }
    }

    if (!installFileExists) {
        return undefined;
    }

    if (!installFileParsed) {
        ghCore.info(`Loading install result file ${installFilePath}`);
        const installFileContents = await fs.promises.readFile(installFilePath);
        installFileParsed = JSON.parse(installFileContents.toString()) as InstallSuccessOutput;
    }

    const clientObj = installFileParsed[client];
    if (clientObj && clientObj.version === version) {
        return {
            ...clientObj,
            source: "disk",
        };
    }
    return undefined;
}

const INSTALL_RESULT_FILENAME = "index.json";
/**
 * @returns Path to the file that tracks what executables were installed. This file is updated each time the action runs.
 * The file only tracks what was installed into the same directory as itself -
 * so if the resutl of getExecutablesTargetDir changes, this file becomes out-of-date.
 */
async function getInstalledFilePath(): Promise<string> {
    return path.join(await getExecutablesTargetDir(), INSTALL_RESULT_FILENAME);
}
