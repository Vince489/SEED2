let seed;
let uploadedImage; // Store the uploaded image
let originalCtx; // Declare originalCtx in the global scope

document.getElementById('upload').addEventListener('change', handleImageUpload);
document.getElementById('quantization').addEventListener('input', updateQuantizationValue);
document.getElementById('generate').addEventListener('click', processImage);
document.getElementById('download').addEventListener('click', downloadImage);

function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const img = new Image();
    const reader = new FileReader();

    reader.onload = function(e) {
        img.src = e.target.result;
        img.onload = () => {
            uploadedImage = img; // Save the loaded image for later processing
            const originalCanvas = document.getElementById('originalCanvas');
            originalCtx = originalCanvas.getContext('2d'); // Initialize originalCtx here

            // Set canvas size and draw the image
            originalCanvas.width = img.width;
            originalCanvas.height = img.height;
            originalCtx.drawImage(img, 0, 0);
        };
    };

    reader.readAsDataURL(file);
}

function updateQuantizationValue() {
    const quantization = document.getElementById('quantization').value;
    document.getElementById('quantizationValue').textContent = quantization;
}

function generateSeed() {
    return Math.floor(Math.random() * 1000000);
}

function processImage() {
    if (!uploadedImage) {
        alert("Please upload an image first!");
        return;
    }

    const simplifiedCanvas = document.getElementById('simplifiedCanvas');
    const simplifiedCtx = simplifiedCanvas.getContext('2d');
    const width = uploadedImage.width;
    const height = uploadedImage.height;

    // Clear previous output
    simplifiedCtx.clearRect(0, 0, simplifiedCanvas.width, simplifiedCanvas.height);

    // Get pixel data
    const imageData = originalCtx.getImageData(0, 0, width, height);
    const pixels = [];
    for (let i = 0; i < imageData.data.length; i += 4) {
        pixels.push([imageData.data[i], imageData.data[i + 1], imageData.data[i + 2]]);
    }

    // Get quantization level and seed
    const k = parseInt(document.getElementById('quantization').value);
    const seedInput = document.getElementById('seedInput').value.trim();

    // Generate seed if the input is empty
    seed = seedInput ? seedInput : generateSeed();
    document.getElementById('generatedSeed').textContent = seed;

    // Quantize pixels
    const quantizedPixels = kMeansQuantize(pixels, k, seed);

    // Create a new ImageData object with quantized colors
    const quantizedData = simplifiedCtx.createImageData(width, height); // Use createImageData
    for (let i = 0; i < quantizedPixels.length; i++) {
        const [r, g, b] = quantizedPixels[i];
        quantizedData.data[i * 4] = r;
        quantizedData.data[i * 4 + 1] = g;
        quantizedData.data[i * 4 + 2] = b;
        quantizedData.data[i * 4 + 3] = 255; // Alpha channel
    }

    simplifiedCanvas.width = width;
    simplifiedCanvas.height = height;
    simplifiedCtx.putImageData(quantizedData, 0, 0);
}

function kMeansQuantize(pixels, k, seed) {
    const random = seededRandom(seed);

    // Initialize k random centroids
    let centroids = [];
    for (let i = 0; i < k; i++) {
        const randomIndex = Math.floor(random() * pixels.length);
        centroids.push(pixels[randomIndex]);
    }

    let clusters = new Array(k);
    let oldCentroids = [];
    let maxIterations = 10;
    let iteration = 0;

    while (!areCentroidsEqual(centroids, oldCentroids) && iteration < maxIterations) {
        // Assign pixels to the nearest centroid
        clusters = new Array(k).fill(null).map(() => []);
        for (const pixel of pixels) {
            let minDistance = Infinity;
            let clusterIndex = 0;
            for (let i = 0; i < centroids.length; i++) {
                const distance = getDistance(pixel, centroids[i]);
                if (distance < minDistance) {
                    minDistance = distance;
                    clusterIndex = i;
                }
            }
            clusters[clusterIndex].push(pixel);
        }

        // Update centroids
        oldCentroids = centroids;
        centroids = clusters.map(cluster => {
            if (cluster.length === 0) return [0, 0, 0];
            const sum = cluster.reduce((acc, pixel) => [acc[0] + pixel[0], acc[1] + pixel[1], acc[2] + pixel[2]], [0, 0, 0]);
            return [Math.floor(sum[0] / cluster.length), Math.floor(sum[1] / cluster.length), Math.floor(sum[2] / cluster.length)];
        });

        iteration++;
    }

    // Assign each pixel to the color of its nearest centroid
    return pixels.map(pixel => {
        let minDistance = Infinity;
        let nearestCentroid = centroids[0];
        for (const centroid of centroids) {
            const distance = getDistance(pixel, centroid);
            if (distance < minDistance) {
                minDistance = distance;
                nearestCentroid = centroid;
            }
        }
        return nearestCentroid;
    });
}

function getDistance(color1, color2) {
    return Math.sqrt(
        Math.pow(color1[0] - color2[0], 2) +
        Math.pow(color1[1] - color2[1], 2) +
        Math.pow(color1[2] - color2[2], 2)
    );
}

function areCentroidsEqual(centroids1, centroids2) {
    if (!centroids1 || !centroids2) return false;
    if (centroids1.length !== centroids2.length) return false;
    for (let i = 0; i < centroids1.length; i++) {
        if (
            centroids1[i][0] !== centroids2[i][0] ||
            centroids1[i][1] !== centroids2[i][1] ||
            centroids1[i][2] !== centroids2[i][2]
        ) {
            return false;
        }
    }
    return true;
}

function seededRandom(seed) {
    return function() {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
    };
}

function downloadImage() {
    const simplifiedCanvas = document.getElementById('simplifiedCanvas');
    const link = document.createElement('a');
    link.href = simplifiedCanvas.toDataURL('image/png');
    link.download = 'quantized-image.png';
    link.click();
}
