import * as ghToolCache from "@actions/tool-cache";
import * as path from "path";

const TAR_ENDINGS = [ ".tar", ".tar.gz", ".tgz" ];
const TAR_BZ2 = ".tar.bz2";
const TAR_XZ = ".tar.xz";
const XAR_ENDINGS = [ ".pkg", ".xar", ".xip" ];
const ZIP = ".zip";
const SEVENZIP = ".7z";

const supportedZipFormats = TAR_ENDINGS.concat(TAR_XZ).concat(XAR_ENDINGS).concat(SEVENZIP).concat(ZIP);

export function canExtract(file: string): boolean {
    return supportedZipFormats.find((zipFormat) => file.endsWith(zipFormat)) != null;
}

export function extract(archivePath: string, dest?: string): Promise<string> {
    const basename = path.basename(archivePath);
    const extname = path.extname(basename);

    // extname will return ".gz" for ".tar.gz" so we have to do an extra check for the double-extension files
    if (TAR_ENDINGS.find((ending) => basename.endsWith(ending)) != null) {
        return ghToolCache.extractTar(archivePath, dest);
    }
    else if (basename.endsWith(TAR_XZ)) {
        // J for xz file
        return ghToolCache.extractTar(archivePath, dest, "xJ");
    }
    else if (basename.endsWith(TAR_BZ2)) {
        // j for xz file
        return ghToolCache.extractTar(archivePath, dest, "j");
    }
    else if (XAR_ENDINGS.find((extension) => extname === extension) != null) {
        return ghToolCache.extractXar(archivePath, dest);
    }
    else if (extname === ".zip") {
        return ghToolCache.extractZip(archivePath, dest);
    }
    else if (extname === ".7z") {
        return ghToolCache.extract7z(archivePath, dest);
    }

    throw new Error(`No way to extract ${archivePath}: Unknown file type "${basename}" - Supported formats are ${supportedZipFormats.join(", ")}`);
}
