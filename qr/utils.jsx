import qrcodegen from "./codegen";
import {
  DEFAULT_BGCOLOR,
  DEFAULT_FGCOLOR,
  DEFAULT_IMG_SCALE,
  DEFAULT_LEVEL,
  DEFAULT_MARGIN,
  DEFAULT_SIZE,
  ERROR_LEVEL_MAP,
} from "./constants";

export function generatePath(modules, margin = 0) {
  const ops = [];
  modules.forEach(function (row, y) {
    let start = null;
    row.forEach(function (cell, x) {
      if (!cell && start !== null) {
        // M0 0h7v1H0z injects the space with the move and drops the comma,
        // saving a char per operation
        ops.push(
          `M${start + margin} ${y + margin}h${x - start}v1H${start + margin}z`
        );
        start = null;
        return;
      }

      // end of row, clean up or skip
      if (x === row.length - 1) {
        if (!cell) {
          // We would have closed the op above already so this can only mean
          // 2+ light modules in a row.
          return;
        }
        if (start === null) {
          // Just a single dark module.
          ops.push(`M${x + margin},${y + margin} h1v1H${x + margin}z`);
        } else {
          // Otherwise finish the current line.
          ops.push(
            `M${start + margin},${y + margin} h${x + 1 - start}v1H${
              start + margin
            }z`
          );
        }
        return;
      }

      if (cell && start === null) {
        start = x;
      }
    });
  });
  return ops.join("");
}

export function getImageSettings(cells, size, margin, imageSettings) {
  if (imageSettings == null) {
    return null;
  }

  const qrCodeSize = cells.length;
  const defaultSize = Math.floor(size * DEFAULT_IMG_SCALE);
  const scale = qrCodeSize / size;
  const w = (imageSettings.width || defaultSize) * scale;
  const h = (imageSettings.height || defaultSize) * scale;

  // Center the image in the QR code area (without margins)
  const x =
    imageSettings.x == null ? qrCodeSize / 2 - w / 2 : imageSettings.x * scale;
  const y =
    imageSettings.y == null ? qrCodeSize / 2 - h / 2 : imageSettings.y * scale;

  let excavation = null;
  if (imageSettings.excavate) {
    const floorX = Math.floor(x);
    const floorY = Math.floor(y);
    const ceilW = Math.ceil(w + x - floorX);
    const ceilH = Math.ceil(h + y - floorY);
    excavation = { x: floorX, y: floorY, w: ceilW, h: ceilH };
  }

  return { x, y, h, w, excavation };
}

export function convertImageSettingsToPixels(
  calculatedImageSettings,
  size,
  numCells,
  margin
) {
  const pixelRatio = size / numCells;
  const imgWidth = calculatedImageSettings.w * pixelRatio;
  const imgHeight = calculatedImageSettings.h * pixelRatio;
  const imgLeft = (calculatedImageSettings.x + margin) * pixelRatio;
  const imgTop = (calculatedImageSettings.y + margin) * pixelRatio;

  return { imgWidth, imgHeight, imgLeft, imgTop };
}

export function QRCodeSVG(props) {
  const {
    value,
    size = DEFAULT_SIZE,
    level = DEFAULT_LEVEL,
    bgColor = DEFAULT_BGCOLOR,
    fgColor = DEFAULT_FGCOLOR,
    margin = DEFAULT_MARGIN,
    isOGContext = false,
    ...otherProps
  } = props;

  const shouldUseHigherErrorLevel =
    isOGContext && (level === "L" || level === "M");

  // Use a higher error correction level 'Q' when excavation is enabled
  // to ensure the QR code remains scannable despite the removed modules.
  const effectiveLevel = shouldUseHigherErrorLevel ? "Q" : level;

  let cells = qrcodegen.QrCode.encodeText(
    value,
    ERROR_LEVEL_MAP[effectiveLevel]
  ).getModules();

  const numCells = cells.length + margin * 2;
  let image = null;

  // Drawing strategy: instead of a rect per module, we're going to create a
  // single path for the dark modules and layer that on top of a light rect,
  // for a total of 2 DOM nodes. We pay a bit more in string concat but that's
  // way faster than DOM ops.
  // For level 1, 441 nodes -> 2
  // For level 40, 31329 -> 2
  const fgPath = generatePath(cells, margin);

  return (
    <svg
      height={size * Number(props.scale)}
      width={size * Number(props.scale)}
      viewBox={`0 0 ${numCells} ${numCells}`}
      {...otherProps}
    >
      <path
        fill={bgColor}
        d={`M0,0 h${numCells}v${numCells}H0z`}
        shapeRendering="crispEdges"
      />
      <path fill={fgColor} d={fgPath} shapeRendering="crispEdges" />
      {image}
    </svg>
  );
}

// For canvas we're going to switch our drawing mode based on whether or not
// the environment supports Path2D. We only need the constructor to be
// supported, but Edge doesn't actually support the path (string) type
// argument. Luckily it also doesn't support the addPath() method. We can
// treat that as the same thing.
export const SUPPORTS_PATH2D = (function () {
  try {
    new Path2D().addPath(new Path2D());
  } catch (e) {
    return false;
  }
  return true;
})();

// We could just do this in generatePath, except that we want to support
// non-Path2D canvas, so we need to keep it an explicit step.
export function excavateModules(modules, excavation) {
  return modules.slice().map((row, y) => {
    if (y < excavation.y || y >= excavation.y + excavation.h) {
      return row;
    }
    return row.map((cell, x) => {
      if (x < excavation.x || x >= excavation.x + excavation.w) {
        return cell;
      }
      return false;
    });
  });
}
