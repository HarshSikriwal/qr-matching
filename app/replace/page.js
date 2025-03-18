"use client";
import jsQR from "jsqr";
import { useCallback, useEffect, useState } from "react";
import { getQRAsCanvas } from "../../qr";

export default function Home() {
  const [result, setResult] = useState(null);
  const [file, setFile] = useState(null);
  const [processedImage, setProcessedImage] = useState(null);

  const qrData = {
    value: "https://instant.cdn.flamapp.com/card", //URL ACCORDING TO THE CAMPAIGN
    bgColor: "#ffffff",
    fgColor: "#000000",
    size: 1024,
    level: "Q",
  };

  const downloadImageData = (imageData, width, height, filename) => {
    // Create a temporary canvas to hold the image data
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = width;
    tempCanvas.height = height;

    const tempCtx = tempCanvas.getContext("2d");
    if (!tempCtx) return;

    // Put the image data on the canvas
    tempCtx.putImageData(imageData, 0, 0);

    // Convert canvas to data URL
    const dataURL = tempCanvas.toDataURL("image/png");

    // Create download link
    const downloadLink = document.createElement("a");
    downloadLink.href = dataURL;
    downloadLink.download = filename;

    // Add to DOM, click and remove (invisible to user)
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);

    console.log(`Downloaded image data as ${filename}`);
  };

  const overlayQRCode = (
    originalCanvas,
    qrLocation,
    newQRData,
    qrCanvas,
    decreaseRatio
  ) => {
    const resultCtx = originalCanvas.getContext("2d");
    if (!resultCtx) return null;

    // Draw the original image
    resultCtx.drawImage(originalCanvas, 0, 0);

    // Calculate the QR code size (use the average of width and height for more accuracy)
    const width =
      Math.ceil(
        (Math.abs(qrLocation.topRightCorner.x - qrLocation.topLeftCorner.x) +
          Math.abs(
            qrLocation.bottomRightCorner.x - qrLocation.bottomLeftCorner.x
          )) /
          2
      ) * decreaseRatio;

    const height =
      Math.ceil(
        (Math.abs(qrLocation.bottomLeftCorner.y - qrLocation.topLeftCorner.y) +
          Math.abs(
            qrLocation.bottomRightCorner.y - qrLocation.topRightCorner.y
          )) /
          2
      ) * decreaseRatio;

    // Get the top-left position of the QR code
    const topLeftX = Math.floor(qrLocation.topLeftCorner.x) * decreaseRatio;
    const topLeftY = Math.floor(qrLocation.topLeftCorner.y) * decreaseRatio;

    // Add a small buffer to ensure complete coverage of the QR code area
    const bufferPx = 1;

    // Draw a white background where the QR code will be placed, with slight buffer
    resultCtx.fillStyle = "white";
    resultCtx.fillRect(
      topLeftX - bufferPx,
      topLeftY - bufferPx,
      width + bufferPx * 2,
      height + bufferPx * 2
    );

    // Create a temporary canvas for the new QR code with the correct size
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext("2d");

    if (!tempCtx) return null;

    tempCtx.drawImage(
      qrCanvas,
      0,
      0,
      newQRData.width,
      newQRData.height,
      0,
      0,
      width,
      height
    );

    // Get the image data from the temporary canvas
    const tempImageData = tempCtx.getImageData(0, 0, width, height);

    // Create a new canvas for the image data
    const newQRCanvas = document.createElement("canvas");
    newQRCanvas.width = width;
    newQRCanvas.height = height;
    const newQRCtx = newQRCanvas.getContext("2d");

    if (!newQRCtx) return null;

    // Put the QR code image data on the canvas
    newQRCtx.putImageData(tempImageData, 0, 0);

    // Draw the new QR code onto the result canvas at the position of the old QR code
    resultCtx.drawImage(newQRCanvas, topLeftX, topLeftY);

    return originalCanvas;
  };

  const decodeQRCode = (imgElement, ratio, dx, dy, decreaseRatio) => {
    return new Promise((resolve) => {
      // Ensure image is fully loaded
      if (!imgElement.complete) {
        imgElement.onload = () => performDecode();
      } else {
        performDecode();
      }

      function performDecode() {
        const canvas = document.createElement("canvas");

        // Wait for a frame to ensure browser has completed image processing
        requestAnimationFrame(() => {
          // Ensure we have valid dimensions
          if (!imgElement.naturalWidth || !imgElement.naturalHeight) {
            resolve({ qrCode: null, canvas: null });
            return;
          }

          const width = Math.floor(
            (imgElement.naturalWidth * ratio) / decreaseRatio
          );
          const height = Math.floor(
            (imgElement.naturalHeight * ratio) / decreaseRatio
          );

          // Set canvas dimensions
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d", {
            willReadFrequently: true,
          });

          if (!ctx) {
            resolve({ qrCode: null, canvas: null });
            return;
          }

          // Clear canvas before drawing
          ctx.clearRect(0, 0, width, height);

          // Enable image smoothing for better quality
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";

          try {
            ctx.drawImage(
              imgElement,
              Math.floor(dx),
              Math.floor(dy),
              Math.floor(imgElement.naturalWidth * ratio),
              Math.floor(imgElement.naturalHeight * ratio),
              0,
              0,
              width,
              height
            );

            const imageData = ctx.getImageData(0, 0, width, height);

            // downloadImageData(
            //     imageData,
            //     width,
            //     height,
            //     `qr_processed_${width}x${height}_${Date.now()}.png`
            // );

            // Add error handling for QR detection
            try {
              const qrCode = jsQR(imageData.data, width, height);
              resolve({ qrCode: qrCode, canvas: canvas });
            } catch (qrError) {
              console.error("QR Detection error:", qrError);
              resolve({ qrCode: null, canvas: canvas });
            }
          } catch (drawError) {
            console.error("Canvas drawing error:", drawError);
            resolve({ qrCode: null, canvas: canvas });
          }
        });
      }
    });
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null); // Clear previous result
      setProcessedImage(null); // Clear previous processed image
      const hiddenImage = document.getElementById("imageToDecode");
      if (hiddenImage) {
        hiddenImage.src = URL.createObjectURL(selectedFile);
      }
    }
  };

  const handleImageLoad = useCallback(async () => {
    const hiddenImage = document.getElementById("imageToDecode");
    if (hiddenImage && !result) {
      let decodedResult;
      let corner = 1;
      let ratio = 1;

      const decreaseRatio =
        hiddenImage.naturalWidth / hiddenImage.naturalHeight <= 0.33 ||
        hiddenImage.naturalWidth / hiddenImage.naturalHeight >= 3
          ? Math.sqrt(
              (hiddenImage.naturalWidth * hiddenImage.naturalHeight) / 1200000
            )
          : hiddenImage.naturalWidth / hiddenImage.naturalHeight <= 0.5 ||
            hiddenImage.naturalWidth / hiddenImage.naturalHeight >= 2
          ? Math.sqrt(
              (hiddenImage.naturalWidth * hiddenImage.naturalHeight) / 900000
            )
          : Math.sqrt(
              (hiddenImage.naturalWidth * hiddenImage.naturalHeight) / 640000
            );

      decodedResult = await decodeQRCode(
        hiddenImage,
        ratio,
        0,
        0,
        decreaseRatio
      );
      ratio = 0.65;
      let dx, dy;

      while (!decodedResult.qrCode && corner <= 5 && ratio === 0.65) {
        switch (corner) {
        //   case 1:
        //     dx = 0;
        //     dy = 0;
        //     break;
        //   case 2:
        //     dx = 0;
        //     dy = hiddenImage.naturalHeight * (1 - ratio);
        //     break;
        //   case 3:
        //     dx = hiddenImage.naturalWidth * (1 - ratio);
        //     dy = hiddenImage.naturalHeight * (1 - ratio);
        //     break;
          case 4:
            dx = hiddenImage.naturalWidth * (1 - ratio);
            dy = 0;
            break;
          case 5:
            dx = (hiddenImage.naturalWidth * (1 - ratio)) / 2;
            dy = (hiddenImage.naturalHeight * (1 - ratio)) / 2;
            break;
          default:
            break;
        }
        decodedResult = await decodeQRCode(
          hiddenImage,
          ratio,
          dx,
          dy,
          decreaseRatio
        );
        console.log(dx, dy);
        corner++;
      }

      if (decodedResult.qrCode) {
        setResult(decodedResult.qrCode.data);

        // Generate new QR code
        const qrCanvas = getQRAsCanvas(qrData, "image/png", true);

        const mainCanvas = document.createElement("canvas");
        const mainContext = mainCanvas.getContext("2d");

        mainCanvas.width = hiddenImage.naturalWidth;
        mainCanvas.height = hiddenImage.naturalHeight;

        mainContext.drawImage(
          hiddenImage,
          0,
          0,
          hiddenImage.naturalWidth,
          hiddenImage.naturalHeight
        );

        const finalLocation =
          dx >= 0 && dy >= 0
            ? {
                topRightCorner: {
                  x: decodedResult.qrCode.location.topRightCorner.x + dx,
                  y: decodedResult.qrCode.location.topRightCorner.y + dy,
                },
                topLeftCorner: {
                  x: decodedResult.qrCode.location.topLeftCorner.x + dx,
                  y: decodedResult.qrCode.location.topLeftCorner.y + dy,
                },
                bottomRightCorner: {
                  x: decodedResult.qrCode.location.bottomRightCorner.x + dx,
                  y: decodedResult.qrCode.location.bottomRightCorner.y + dy,
                },
                bottomLeftCorner: {
                  x: decodedResult.qrCode.location.bottomLeftCorner.x + dx,
                  y: decodedResult.qrCode.location.bottomLeftCorner.y + dy,
                },
              }
            : { ...decodedResult.qrCode.location };

        // Replace QR code in the image
        const processedCanvas = overlayQRCode(
          mainCanvas,
          finalLocation,
          {
            width: qrCanvas.width,
            height: qrCanvas.height,
          },
          qrCanvas,
          decreaseRatio
        );

        if (processedCanvas) {
          setProcessedImage(processedCanvas.toDataURL("image/png"));
        }
      } else {
        setResult("Unable to find QR code");
      }

      // Clean up the object URL to avoid memory leaks
      URL.revokeObjectURL(hiddenImage.src);
    }
  }, [file, result]);

  useEffect(() => {
    return () => {
      // Cleanup object URL to avoid memory leaks
      if (file) {
        URL.revokeObjectURL(URL.createObjectURL(file));
      }
    };
  }, [file]);

  return (
    <main className="flex min-h-screen w-full overflow-auto flex-col items-center justify-between p-24">
      <div className="flex items-center w-full flex-col gap-4">
        <h1 className="text-2xl font-bold mb-4">QR Code Replacer</h1>

        <input type="file" accept="image/*" onChange={handleFileChange} />

        {file && (
          <div className="flex flex-col items-center justify-center">
            <img
              id="imageToDecode"
              onLoad={handleImageLoad}
              alt="image"
              src={URL.createObjectURL(file)}
              className="invisible absolute grayscale"
            />
          </div>
        )}

        {result && <p>Detected QR Code: {result}</p>}

        {processedImage && (
          <div className="mt-4">
            <h2 className="text-xl font-bold mb-2">Processed Image</h2>
            <img
              src={processedImage}
              alt="Processed image with replaced QR code"
              className="max-w-lg border-2 border-gray-300"
            />
            <a
              href={processedImage}
              download="processed_qr_image.png"
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 inline-block"
            >
              Download Processed Image
            </a>
          </div>
        )}
      </div>
    </main>
  );
}
