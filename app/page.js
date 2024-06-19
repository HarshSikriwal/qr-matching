"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import jsQR from "jsqr";

export default function Home() {
  const [result, setResult] = useState(null);
  const [file, setFile] = useState(null);

  const hiddenImageRef = useRef(null);
  const getPreviewUrl = (file) => {
    if (!file) return null;
    return URL.createObjectURL(file);
  };
  console.log("result", result);
  const decodeQRCode = (imgElement, ratio, dx, dy) => {
    return new Promise((resolve) => {
      const canvas = document.createElement("canvas");
      canvas.width = imgElement.width * ratio;
      canvas.height = imgElement.height * ratio;

      const width = imgElement.width * ratio;
      const height = imgElement.height * ratio;

      const naturalWidth = imgElement.naturalWidth * ratio;
      const naturalHeight = imgElement.naturalHeight * ratio;

      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(
          imgElement,
          dx,
          dy,
          Math.floor(naturalWidth),
          Math.floor(naturalHeight),
          0,
          0,
          Math.floor(width),
          Math.floor(height)
        );
        const imageData = ctx.getImageData(
          0,
          0,
          Math.floor(width),
          Math.floor(height)
        );
        // const newCanvas = document.createElement("canvas");
        // newCanvas.width = imageData.width;
        // newCanvas.height = imageData.height;
        // const newCtx = newCanvas.getContext("2d");
        // newCtx.putImageData(imageData, 0, 0);

        // const dataUrl = newCanvas.toDataURL("image/png");
        // const link = document.createElement("a");
        // link.href = dataUrl;
        // link.download = "image.png";
        // document.body.appendChild(link);
        // link.click();
        // document.body.removeChild(link);

        const qrCode = jsQR(
          imageData.data,
          Math.floor(width),
          Math.floor(height)
        );
        resolve(qrCode ? qrCode.data : null);
      } else {
        resolve(null);
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
      embeddedQRData = await decodeQRCode(hiddenImage, 1, 0, 0);
      while (!embeddedQRData && corner <= 4) {
        let dx, dy;
        switch (corner) {
          case 1:
            dx = 0;
            dy = 0;
            break;
          case 2:
            dx = 0;
            dy = hiddenImage.naturalHeight * (0.35);
            break;
          case 3:
            dx = hiddenImage.naturalWidth * (0.35);
            dy = hiddenImage.naturalHeight * (0.35);
            break;
          case 4:
            dx = hiddenImage.naturalWidth * (0.35);
            dy = 0;
            break;
          default:
            break;
        }
        embeddedQRData = await decodeQRCode(hiddenImage,  0.65, dx, dy);
        console.log(dx, dy)
        corner++;
      }

      if (embeddedQRData) {
        setResult(embeddedQRData);
      } else {
        setResult("Unable to find QR code");
      }
      // Clean up the object URL to avoid memory leaks
      URL.revokeObjectURL(hiddenImage.src);
    }
  }, [file]);

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
            <Image
              id="imageToDecode"
              onLoad={handleImageLoad}
              alt="image"
              src={URL.createObjectURL(file)}
              fill
              className="invisible absolute grayscale"
            />
            <Image
              src={URL.createObjectURL(file)}
              alt="Uploaded Image Preview"
              width={250}
              height={300}
              className="grayscale"
              crossOrigin="anonymous"
            />
          </div>
        )}
        {result && <p className="text-white">Result: {result}</p>}
      </div>
    </main>
  );
}
