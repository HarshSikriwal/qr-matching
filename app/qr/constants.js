import qrcodegen from "./codegen";

export const ERROR_LEVEL_MAP = {
    L: qrcodegen.QrCode.Ecc.LOW,
    M: qrcodegen.QrCode.Ecc.MEDIUM,
    Q: qrcodegen.QrCode.Ecc.QUARTILE,
    H: qrcodegen.QrCode.Ecc.HIGH,
};

export const DEFAULT_SIZE = 128;
export const DEFAULT_LEVEL = "L";
export const DEFAULT_BGCOLOR = "#FFFFFF";
export const DEFAULT_FGCOLOR = "#000000";
export const DEFAULT_INCLUDEMARGIN = false;
export const DEFAULT_MARGIN = 0;

export const MARGIN_SIZE = 2;

export const QR_LEVELS = ["L", "M", "Q", "H"];

// This is *very* rough estimate of max amount of QRCode allowed to be covered.
// It is "wrong" in a lot of ways (area is a terrible way to estimate, it
// really should be number of modules covered), but if for some reason we don't
// get an explicit height or width, I'd rather default to something than throw.
export const DEFAULT_IMG_SCALE = 0.1;
