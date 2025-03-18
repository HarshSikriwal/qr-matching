"use client";
import jsQR from "jsqr";
import { useCallback, useEffect, useState } from "react";

export default function Home() {
  const [result, setResult] = useState(null);
  const [file, setFile] = useState(null);

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

  const decodeQRCode = (imgElement, ratio, dx, dy) => {
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
            resolve(null);
            return;
          }

          const decreaseRatio =
            imgElement.naturalWidth / imgElement.naturalHeight <= 0.33 ||
            imgElement.naturalWidth / imgElement.naturalHeight >= 3
              ? Math.sqrt(
                  (imgElement.naturalWidth * imgElement.naturalHeight) / 1200000
                )
              : imgElement.naturalWidth / imgElement.naturalHeight <= 0.5 ||
                imgElement.naturalWidth / imgElement.naturalHeight >= 2
              ? Math.sqrt(
                  (imgElement.naturalWidth * imgElement.naturalHeight) / 900000
                )
              : Math.sqrt(
                  (imgElement.naturalWidth * imgElement.naturalHeight) / 640000
                );

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
            resolve(null);
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
              resolve(qrCode ? qrCode.data : null);
            } catch (qrError) {
              console.error("QR Detection error:", qrError);
              resolve(null);
            }
          } catch (drawError) {
            console.error("Canvas drawing error:", drawError);
            resolve(null);
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
      const hiddenImage = document.getElementById("imageToDecode");
      if (hiddenImage) {
        hiddenImage.src = URL.createObjectURL(selectedFile);
      }
    }
  };

  const handleImageLoad = useCallback(async () => {
    const hiddenImage = document.getElementById("imageToDecode");
    if (hiddenImage && !result) {
      let embeddedQRData;
      let corner = 1;
      let ratio = 1;
      embeddedQRData = await decodeQRCode(hiddenImage, ratio, 0, 0);
      ratio = 0.65;
      while (!embeddedQRData && corner <= 5 && ratio === 0.65) {
        let dx, dy;
        switch (corner) {
          case 1:
            dx = 0;
            dy = 0;
            break;
          case 2:
            dx = 0;
            dy = hiddenImage.naturalHeight * (1 - ratio);
            break;
          case 3:
            dx = hiddenImage.naturalWidth * (1 - ratio);
            dy = hiddenImage.naturalHeight * (1 - ratio);
            break;
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
        embeddedQRData = await decodeQRCode(hiddenImage, ratio, dx, dy);
        console.log(dx, dy);
        corner++;
      }

      // corner = 1;
      // ratio = 0.3;
      // while (!embeddedQRData && corner <= 5 && ratio === 0.3) {
      //   let dx, dy;
      //   switch (corner) {
      //     case 1:
      //       dx = 0;
      //       dy = 0;
      //       break;
      //     case 2:
      //       dx = 0;
      //       dy = hiddenImage.naturalHeight * (1 - ratio);
      //       break;
      //     case 3:
      //       dx = hiddenImage.naturalWidth * (1 - ratio);
      //       dy = hiddenImage.naturalHeight * (1 - ratio);
      //       break;
      //     case 4:
      //       dx = hiddenImage.naturalWidth * (1 - ratio);
      //       dy = 0;
      //       break;
      //     case 5:
      //       dx = (hiddenImage.naturalWidth * (1 - ratio)) / 2;
      //       dy = (hiddenImage.naturalHeight * (1 - ratio)) / 2;
      //       break;
      //     default:
      //       break;
      //   }
      //   embeddedQRData = await decodeQRCode(hiddenImage, ratio, dx, dy);
      //   console.log(dx, dy);
      //   corner++;
      // }

      if (embeddedQRData) {
        setResult(embeddedQRData);
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
        <input type="file" accept="image/*" onChange={handleFileChange} />

        {file && (
          <div className="flex flex-col items-center justify-center">
            <img
              id="imageToDecode"
              onLoad={handleImageLoad}
              alt="image"
              src={URL.createObjectURL(file)}
              fill
              className="invisible absolute grayscale"
            />
          </div>
        )}
        {result && <p className="text-white">Result: {result}</p>}
      </div>
    </main>
  );
}
