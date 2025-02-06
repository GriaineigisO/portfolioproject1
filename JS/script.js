// Global variable to store country data
let countryData = null;

// Reference to the Leaflet map (initialize it once globally)
let map;

// Fetch country data and store it globally
async function fetchCountries() {
  try {
    const response = await fetch(
      "http://localhost/maarcisOdonon/portfolioproject1/PHP/data.php"
    );
    countryData = await response.json(); // Store the data globally
    console.log("Country data loaded:", countryData);
  } catch (error) {
    console.error("Error loading countries:", error);
  }
}

// Function to initialize the map and set the view to the user's location
function initializeMap() {
  // Default view (fallback if geolocation fails)
  const defaultView = [20, 0];
  const defaultZoom = 2;

  // Initialize the map
  map = L.map("map").setView(defaultView, defaultZoom);

  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);

  // Try to get the user's current location
  if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;

        // Set the map view to the user's location
        map.setView([userLat, userLng], 13); // Zoom level 13 for a closer view
      },
      (error) => {
        console.error("Error getting user location:", error);
        // Fallback to default view if geolocation fails
        map.setView(defaultView, defaultZoom);
      }
    );
  } else {
    console.log("Browser doesn't support geolocation!");
    // Fallback to default view if geolocation is not supported
    map.setView(defaultView, defaultZoom);
  }
}

// Function to update the map when a country is selected
function useSelectedCountry() {
  if (!countryData) {
    console.error("Country data not loaded yet!");
    return;
  }

  let selectedCountry = document.getElementById("countrySelect").value;
  let countryNameH4 = document.getElementById("country-name");
  let flag = document.getElementById("flag");
  countryNameH4.innerHTML = selectedCountry;

  for (let i = 0; i < countryData.features.length; i++) {
    if (countryData.features[i].properties.name === selectedCountry) {
      const geometry = countryData.features[i].geometry;
      countryInfo(
        countryData.features[i].properties.iso_a2,
        countryData.features[i].properties.name
      );

      // Handle Polygon or MultiPolygon
      if (geometry.type === "Polygon" || geometry.type === "MultiPolygon") {
        const feature = turf.feature(geometry); // Create a Turf feature
        const bbox = turf.bbox(feature); // Get bounding box
        map.fitBounds([
          [bbox[1], bbox[0]],
          [bbox[3], bbox[2]],
        ]); // Fit map to bounds
      } else {
        console.error("Unsupported geometry type:", geometry.type);
      }
      return;
    }
  }

  console.warn("Country not found in dataset!");
}

// Wait for the DOM to load, then initialize the map and fetch country data
document.addEventListener("DOMContentLoaded", async function () {
  initializeMap(); // Initialize the map with user's location or default view
  await fetchCountries(); // Load country data
  document
    .getElementById("countrySelect")
    .addEventListener("change", useSelectedCountry);
});

function countryInfo(countryCode, countryName) {
  $.ajax({
    url: "./PHP/countryInfo.php",
    type: "GET",
    dataType: "json",
    data: {
      place: countryCode,
    },
    success: function (result) {
      if (result.status.name === "ok") {
        const entry = result.data.country;
        $("#population").html(parseInt(entry.population).toLocaleString());
        $("#capital").html(entry.capital);
        $("#feature").html(entry.feature);
        $("#country-code").html(entry.countryCode);
        $("#continent").html(entry.continentName);
        $("#currency").html(entry.currencyCode);
        $("#area").html(parseInt(entry.areaInSqKm).toLocaleString());
        $("#flag").attr(
          "src",
          `https://flagsapi.com/${entry.countryCode}/shiny/64.png`
        );
        $("#country-name").attr(
          "href",
          `https://en.wikipedia.org/wiki/${countryName}`
        );
      } else {
        console.error("API status is not OK:", result.status);
      }
    },
    error: function (jqXHR, textStatus, errorThrown) {
      console.error("AJAX Error:", textStatus, errorThrown, jqXHR.responseText);
      console.log(jqXHR.responseText);
    },
  });

  $.ajax({
    url: `https://api.countrylayer.com/v2/name/${countryName}?access_key=
03b4bb78064bdd17697fcff47e22c695&fullText=true`,
    type: "GET",
    dataType: "json",
    success: function (result) {
      const entry = result;
      console.log(result);
      $("#denonym").html(entry.demonym);
    },
    error: function (jqXHR, textStatus, errorThrown) {
      console.error("AJAX Error:", textStatus, errorThrown, jqXHR.responseText);
      console.log(jqXHR.responseText);
    },
  });
}
