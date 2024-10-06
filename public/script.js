let seed;
let uploadedImage; // Store the uploaded image
let originalCtx; // Declare originalCtx in the global scope
const worker = new Worker('quantizeWorker.js'); // Create a new Web Worker

// Define sampler options for each model
const samplers = {
    LP: [2, 4, 6, 8, 10],
    MP: [12, 14, 16, 18],
    MHP: [20, 24, 28, 32],
    HP: [48, 64, 96, 128]
};

// Event listeners for dynamic sampler selection
document.getElementById('baseModelSelect').addEventListener('change', function () {
    const selectedModel = this.value;
    const samplerSelect = document.getElementById('samplerSelect');
    
    // Clear previous sampler options
    samplerSelect.innerHTML = '';

    // Populate sampler dropdown based on selected base model
    const modelSamplers = samplers[selectedModel];
    modelSamplers.forEach(sampler => {
        const option = document.createElement('option');
        option.value = sampler;
        option.textContent = `${sampler} Sampler`;
        samplerSelect.appendChild(option);
    });
});

// Trigger initial population on page load
document.getElementById('baseModelSelect').dispatchEvent(new Event('change'));

// Event listeners for image processing
document.getElementById('upload').addEventListener('change', handleImageUpload);
document.getElementById('quantization').addEventListener('input', updateQuantizationValue);
document.getElementById('generate').addEventListener('click', processImage);
document.getElementById('download').addEventListener('click', downloadImage);

// Handle image upload
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

// Update quantization value display
function updateQuantizationValue() {
    const quantization = document.getElementById('quantization').value;
    document.getElementById('quantizationValue').textContent = quantization;
}

// Generate a random seed
function generateSeed() {
    return Math.floor(Math.random() * 1000000);
}

// Process image using the worker
function processImage() {
    if (!uploadedImage) {
        alert("Please upload an image first!");
        return;
    }

    // Show loading indicator
    const loadingIndicator = document.getElementById('loadingIndicator');
    loadingIndicator.style.display = 'block'; // Show loading indicator

    const simplifiedCanvas = document.getElementById('simplifiedCanvas');
    const simplifiedCtx = simplifiedCanvas.getContext('2d');
    const width = uploadedImage.width;
    const height = uploadedImage.height;

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

    // Create a new Web Worker for processing
    const worker = new Worker('quantizeWorker.js');
    worker.postMessage({ pixels, k, seed });

    worker.onmessage = function(e) {
        const quantizedPixels = e.data;

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
        
        // Hide loading indicator
        loadingIndicator.style.display = 'none'; // Hide loading indicator
    };

    worker.onerror = function(error) {
        console.error('Error in worker:', error);
        loadingIndicator.style.display = 'none'; // Hide loading indicator on error
    };
}

// Handle worker response
worker.onmessage = function(e) {
    document.getElementById('loadingIndicator').style.display = 'none'; // Hide loading indicator
    const quantizedPixels = e.data;
    drawQuantizedImage(quantizedPixels);
};

// Log errors from the worker
worker.onerror = function(e) {
    console.error("Error in worker:", e.message);
};

// Function to draw the quantized image
function drawQuantizedImage(quantizedPixels) {
    const simplifiedCanvas = document.getElementById('simplifiedCanvas');
    const simplifiedCtx = simplifiedCanvas.getContext('2d');
    const width = uploadedImage.width;
    const height = uploadedImage.height;

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

// Download the quantized image
function downloadImage() {
    const simplifiedCanvas = document.getElementById('simplifiedCanvas');
    const link = document.createElement('a');
    link.href = simplifiedCanvas.toDataURL('image/png');
    link.download = 'quantized-image.png';
    link.click();
}
