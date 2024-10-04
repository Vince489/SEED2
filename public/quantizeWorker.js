self.onmessage = function(e) {
  console.log("Worker received data:", e.data);
  const { pixels, k, seed } = e.data;

  const quantizedPixels = kMeansQuantize(pixels, k, seed);
  console.log("Quantization complete, sending data back.");
  self.postMessage(quantizedPixels);
};

// K-Means quantization function
function kMeansQuantize(pixels, k, seed) {
  const random = seededRandom(seed);

  // Initialize k random centroids
  let centroids = [];
  for (let i = 0; i < k; i++) {
      const randomIndex = Math.floor(random() * pixels.length);
      centroids.push(pixels[randomIndex]);
  }

  let clusters = new Array(k);
  let oldCentroids = new Array(k); // Ensure oldCentroids is initialized with the same length as centroids
  let maxIterations = 10;
  let iteration = 0;

  do {
      // Assign pixels to the nearest centroid
      clusters = new Array(k).fill(null).map(() => []); // Reset clusters
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
      oldCentroids = centroids.map(centroid => [...centroid]); // Clone centroids
      centroids = clusters.map(cluster => {
          if (cluster.length === 0) return [0, 0, 0]; // Default value for empty clusters
          const sum = cluster.reduce((acc, pixel) => [acc[0] + pixel[0], acc[1] + pixel[1], acc[2] + pixel[2]], [0, 0, 0]);
          return [Math.floor(sum[0] / cluster.length), Math.floor(sum[1] / cluster.length), Math.floor(sum[2] / cluster.length)];
      });

      iteration++;
  } while (!areCentroidsEqual(centroids, oldCentroids) && iteration < maxIterations);

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

// Utility function to calculate the distance between two colors
function getDistance(color1, color2) {
  return Math.sqrt((color1[0] - color2[0]) ** 2 + (color1[1] - color2[1]) ** 2 + (color1[2] - color2[2]) ** 2);
}

// Function to check if centroids are equal
function areCentroidsEqual(centroids, oldCentroids) {
  return centroids.every((centroid, index) => {
      return oldCentroids[index] && // Check if oldCentroid exists
          centroid[0] === oldCentroids[index][0] && 
          centroid[1] === oldCentroids[index][1] && 
          centroid[2] === oldCentroids[index][2];
  });
}

// Implementation for seeded random function
function seededRandom(seed) {
  let m = 0x80000000, // 2**31
      a = 1103515245,
      c = 12345;

  let state = seed;

  return function() {
      state = (a * state + c) % m;
      return state / m; // Returns a number between 0 and 1
  };
}
