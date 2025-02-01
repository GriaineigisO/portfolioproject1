// Global variable to store country data
let countryData = null;

// Reference to the Leaflet map (initialize it once globally)
let map = L.map("map").setView([20, 0], 17); // Default view

L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(map);

// Fetch country data and store it globally
async function fetchCountries() {
  try {
    const response = await fetch("http://localhost/maarcisOdonon/portfolioproject1/PHP/data.php");
    countryData = await response.json(); // Store the data globally
    console.log("Country data loaded:", countryData);
  } catch (error) {
    console.error("Error loading countries:", error);
  }
}

// Function to update the map when a country is selected
function useSelectedCountry() {
  if (!countryData) {
    console.error("Country data not loaded yet!");
    return;
  }

  let selectedCountry = document.getElementById("countrySelect").value;
  console.log("Selected country:", selectedCountry);

  for (let i = 0; i < countryData.features.length; i++) {
    if (countryData.features[i].properties.name === selectedCountry) {
      let coordinates = countryData.features[i].geometry.coordinates;

      // Handle MultiPolygons or Polygons
      let firstPolygon = coordinates[0][0]; // Get first polygon's first coordinate
      let lon = firstPolygon[0]; // GeoJSON stores [longitude, latitude]
      let lat = firstPolygon[1]; // Swap for Leaflet

      console.log("Moving to:", lat, lon);
      map.setView([lat, lon], 7); // Update map view
      return;
    }
  }

  console.warn("Country not found in dataset!");
}

// Wait for the DOM to load, then attach event listeners
document.addEventListener("DOMContentLoaded", async function () {
  await fetchCountries(); // Load country data
  document.getElementById("countrySelect").addEventListener("change", useSelectedCountry);
});
