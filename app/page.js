"use client";
import { useState, useEffect, useRef } from "react";
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

      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(imgElement, dx, dy, Math.floor(width), Math.floor(height));
        const imageData = ctx.getImageData(
          0,
          0,
          Math.floor(width),
          Math.floor(height)
        );
        console.log(imageData);

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

  const handleImageLoad = async () => {
    const hiddenImage = document.getElementById("imageToDecode");
    if (hiddenImage) {
      let embeddedQRData;
      let ratio = 1;
      let corner = 1;
      while (!embeddedQRData && corner <= 4) {
        while (!embeddedQRData && ratio > 0.7) {
          let dx, dy;
          switch (corner) {
            case 1:
              dx = 0;
              dy = 0;
              break;
            case 2:
              dx = 0;
              dy = hiddenImage.height * (1 - ratio);
            case 3:
              dx = hiddenImage.width * (1 - ratio);
              dy = hiddenImage.height * (1 - ratio);
            case 4:
              dx = hiddenImage.width * (1 - ratio);
              dy = 0;
            default:
              break;
          }
          embeddedQRData = await decodeQRCode(hiddenImage, ratio, dx, dy);
          ratio *= 0.9;
        }
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
  };

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
        {result !== null && <p className="text-white">Result: {result}</p>}
      </div>
    </main>
  );
}
