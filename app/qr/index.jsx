/**
 * @license qrcode.react
 * Copyright (c) Paul O'Shannessy
 * SPDX-License-Identifier: ISC
 */
import qrcodegen from "./codegen";
import {
  DEFAULT_BGCOLOR,
  DEFAULT_FGCOLOR,
  DEFAULT_LEVEL,
  DEFAULT_MARGIN,
  DEFAULT_SIZE,
  ERROR_LEVEL_MAP,
} from "./constants";
import {
  SUPPORTS_PATH2D,
  excavateModules,
  generatePath,
  getImageSettings,
} from "./utils";

/**
 * Generates a QR code on a canvas and returns the canvas element
 * @param {Object} options - QR code options
 * @param {string} options.value - The value to encode in the QR code
 * @param {number} [options.size=256] - Size of the QR code in pixels
 * @param {string} [options.level="L"] - Error correction level of the QR code (L, M, Q, H)
 * @param {string} [options.bgColor="#FFFFFF"] - Background color of the QR code
 * @param {string} [options.fgColor="#000000"] - Foreground color of the QR code
 * @param {number} [options.margin=4] - Margin around the QR code
 * @param {Object} [options.imageSettings] - Settings for an image overlay in the QR code
 * @param {string} [options.imageSettings.src] - URL of the image to overlay
 * @param {number} [options.imageSettings.width] - Width of the image in QR code cells
 * @param {number} [options.imageSettings.height] - Height of the image in QR code cells
 * @param {number} [options.imageSettings.x] - X position of the image in QR code cells
 * @param {number} [options.imageSettings.y] - Y position of the image in QR code cells
 * @param {string} [format="image/png"] - Image format for toDataURL (ignored for canvas return)
 * @param {boolean} [returnCanvas=false] - Whether to return the canvas element instead of ImageData
 * @returns {HTMLCanvasElement|ImageData} - Either the canvas element or the ImageData of the QR code
 */
export function getQRAsCanvas(options, format = "image/png", returnCanvas = false) {
  const {
    value,
    size = DEFAULT_SIZE,
    level = DEFAULT_LEVEL,
    bgColor = DEFAULT_BGCOLOR,
    fgColor = DEFAULT_FGCOLOR,
    margin = DEFAULT_MARGIN,
    imageSettings,
  } = options;

  // Create a canvas element
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not get canvas context");
  }

  // Generate QR code cells
  let cells = qrcodegen.QrCode.encodeText(
    value,
    ERROR_LEVEL_MAP[level]
  ).getModules();

  const numCells = cells.length + margin * 2;
  
  // Set canvas size (with device pixel ratio for better resolution)
  const pixelRatio = window.devicePixelRatio || 1;
  canvas.height = canvas.width = size * pixelRatio;
  const scale = (size / numCells) * pixelRatio;
  ctx.scale(scale, scale);

  // Draw background
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, numCells, numCells);

  // Handle image settings if provided
  let image = null;
  let calculatedImageSettings = null;
  
  if (imageSettings?.src) {
    // Create image element to load the image
    image = new Image();
    image.src = imageSettings.src;
    
    // Only process image if it's loaded
    if (image.complete && image.naturalHeight !== 0) {
      calculatedImageSettings = getImageSettings(cells, size, margin, imageSettings);
      
      if (calculatedImageSettings?.excavation) {
        cells = excavateModules(cells, calculatedImageSettings.excavation);
      }
    }
  }

  // Draw QR code cells
  ctx.fillStyle = fgColor;
  if (SUPPORTS_PATH2D) {
    ctx.fill(new Path2D(generatePath(cells, margin)));
  } else {
    cells.forEach(function (row, rdx) {
      row.forEach(function (cell, cdx) {
        if (cell) {
          ctx.fillRect(cdx + margin, rdx + margin, 1, 1);
        }
      });
    });
  }

  // Draw image overlay if available
  if (image && calculatedImageSettings) {
    ctx.drawImage(
      image,
      calculatedImageSettings.x + margin,
      calculatedImageSettings.y + margin,
      calculatedImageSettings.w,
      calculatedImageSettings.h
    );
  }

  // Return either the canvas or its image data
  if (returnCanvas) {
    return canvas;
  } else {
    // Get the image data from the canvas
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  }
}