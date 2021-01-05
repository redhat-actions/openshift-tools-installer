import * as ghToolCache from "@actions/tool-cache";
import * as path from "path";

type ToolCacheExtractFunc = (file: string, dest?: string | undefined) => Promise<string>;

const tarEndsWiths = [ ".tar", ".tar.gz", ".tar.xz", ".tar.bz2", ".tgz" ];
const xarEndsWiths = [ ".pkg", ".xar", ".xip" ];
const ZIP = ".zip";
const SEVENZIP = ".7z";

const supportedZipFormats = tarEndsWiths.concat(xarEndsWiths).concat(SEVENZIP).concat(ZIP);

function getExtractorFunc(file: string): ToolCacheExtractFunc | undefined {
    const extname = path.extname(file);

    // extname will return ".gz" for ".tar.gz" so we have to do an extra check for the double-extension files
    if (tarEndsWiths.find((ending) => file.endsWith(ending)) != null) {
        return ghToolCache.extractTar;
    }
    else if (xarEndsWiths.find((extension) => extname === extension) != null) {
        return ghToolCache.extractXar;
    }
    else if (extname === ".zip") {
        return ghToolCache.extractZip;
    }
    else if (extname === ".7z") {
        return ghToolCache.extract7z;
    }
    return undefined;
}

export function canExtract(file: string): boolean {
    return getExtractorFunc(file) != null;
}

export function extract(archivePath: string, dest?: string): Promise<string> {
    const basename = path.basename(archivePath);

    const extractorFunc = getExtractorFunc(basename);
    if (!extractorFunc) {
        throw new Error(`No way to extract ${archivePath}: Unknown file type "${basename}" - ` +
            `Supported formats are ${supportedZipFormats.join(", ")}`);
    }

    return extractorFunc(archivePath, dest);
}
