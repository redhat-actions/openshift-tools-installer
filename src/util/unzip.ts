import * as ghToolCache from "@actions/tool-cache";
import * as path from "path";

const TAR_ENDINGS = [ ".tar", ".tar.gz", ".tgz" ];
const TAR_BZ2 = ".tar.bz2";
const TAR_XZ = ".tar.xz";

// Removed .pkg from XAR because .pkg and .xz are available for CRC mac,
// but the pkg has a different directory structure.
const XAR_ENDINGS = [ ".xar", ".xip" /* , .pkg */ ];
const ZIP = ".zip";
const SEVENZIP = ".7z";

const supportedZipFormats = TAR_ENDINGS.concat(TAR_XZ).concat(XAR_ENDINGS).concat(SEVENZIP).concat(ZIP);

/**
 * @returns If @see extract will be able to extract the given file.
 */
export function canExtract(file: string): boolean {
    return supportedZipFormats.find((zipFormat) => file.endsWith(zipFormat)) != null;
}

/**
 * Use actions/tool-cache to extract the given archive.
 * @returns Path to the destination directory.
 */
export function extract(archivePath: string, dest?: string): Promise<string> {
    const basename = path.basename(archivePath);
    const extname = path.extname(basename);

    // extname will return ".gz" for ".tar.gz" so we have to do an extra check for the double-extension files
    if (TAR_ENDINGS.find((ending) => basename.endsWith(ending)) != null) {
        return ghToolCache.extractTar(archivePath, dest);
    }
    if (basename.endsWith(TAR_XZ)) {
        // J for xz file
        return ghToolCache.extractTar(archivePath, dest, "xJ");
    }
    if (basename.endsWith(TAR_BZ2)) {
        // j for bz file
        return ghToolCache.extractTar(archivePath, dest, "j");
    }
    if (XAR_ENDINGS.find((extension) => extname === extension) != null) {
        return ghToolCache.extractXar(archivePath, dest);
    }
    if (extname === ".zip") {
        return ghToolCache.extractZip(archivePath, dest);
    }
    if (extname === ".7z") {
        return ghToolCache.extract7z(archivePath, dest);
    }

    throw new Error(
        `No way to extract ${archivePath}: `
        + `Unknown file type "${basename}" - Supported formats are ${supportedZipFormats.join(", ")}`
    );
}
