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
    const decodeQRCode = (imgElement) => {
        return new Promise((resolve) => {
            const canvas = document.createElement("canvas");
            canvas.width = imgElement.width;
            canvas.height = imgElement.height;
            const ctx = canvas.getContext("2d");
            if (ctx) {
                ctx.drawImage(
                    imgElement,
                    0,
                    0,
                    imgElement.width,
                    imgElement.height
                );
                const imageData = ctx.getImageData(
                    0,
                    0,
                    imgElement.width,
                    imgElement.height
                );
                const qrCode = jsQR(
                    imageData.data,
                    imageData.width,
                    imageData.height
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
            const embeddedQRData = await decodeQRCode(hiddenImage);
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
                <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                />

                {file && (
                    <div className="flex flex-col items-center justify-center">
                        <Image
                            id="imageToDecode"
                            onLoad={handleImageLoad}
                            alt="image"
                            src={URL.createObjectURL(file)}
                            fill
                            className="invisible absolute"
                        />
                        <Image
                            src={URL.createObjectURL(file)}
                            alt="Uploaded Image Preview"
                            width={250}
                            height={300}
                            crossOrigin="anonymous"
                        />
                    </div>
                )}
                {result !== null && (
                    <p className="text-white">Result: {result}</p>
                )}
            </div>
        </main>
    );
}
