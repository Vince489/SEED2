document.addEventListener('DOMContentLoaded', function () {
    let seed;
    let uploadedImage; // Store the uploaded image
    let originalCtx; // Declare originalCtx in the global scope
    const worker = new Worker('quantizeWorker.js'); // Create a new Web Worker

    // Event listeners
    document.getElementById('upload').addEventListener('change', handleImageUpload);
    document.getElementById('generate').addEventListener('click', processImage);
    document.getElementById('download').addEventListener('click', downloadImage);

    // Update sampler options when base model is selected
    document.getElementById('baseModelSelect').addEventListener('change', updateSamplerOptions);

    // Function to update the sampler dropdown based on selected base model
    function updateSamplerOptions() {
        const baseModel = document.getElementById('baseModelSelect').value;
        const samplerSelect = document.getElementById('samplerSelect');
        samplerSelect.innerHTML = ''; // Clear existing options

        let options = [];

        switch (baseModel) {
            case 'LP':
                options = [2, 4, 6, 8, 10];
                break;
            case 'MP':
                options = [12, 14, 16, 18];
                break;
            case 'MHP':
                options = [20, 24, 28, 32];
                break;
            case 'HP':
                options = [48, 64, 96, 128];
                break;
            default:
                options = [];
        }

        // Add new options to the sampler select element
        options.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option;
            optionElement.textContent = option;
            samplerSelect.appendChild(optionElement);
        });
    }

    // Handle image upload
    function handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const img = new Image();
        const reader = new FileReader();

        reader.onload = function (e) {
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
        const k = parseInt(document.getElementById('samplerSelect').value);
        const seedInput = document.getElementById('seedInput').value.trim();

        // Generate seed if the input is empty
        seed = seedInput ? seedInput : generateSeed();
        document.getElementById('generatedSeed').textContent = seed;

        // Create a new Web Worker for processing
        worker.postMessage({ pixels, k, seed });

        worker.onmessage = function (e) {
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

        worker.onerror = function (error) {
            console.error('Error in worker:', error);
            loadingIndicator.style.display = 'none'; // Hide loading indicator on error
        };
    }

    // Download the quantized image
    function downloadImage() {
        const simplifiedCanvas = document.getElementById('simplifiedCanvas');
        const link = document.createElement('a');
        link.href = simplifiedCanvas.toDataURL('image/png');
        link.download = 'quantized-image.png';
        link.click();
    }
});
