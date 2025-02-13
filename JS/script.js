// Global variable to store country data
let countryData = null;

// Reference to the Leaflet map (initialize it once globally)
let map;

// Fetch country data and store it globally
async function fetchCountries() {
  try {
    const response = await fetch("./PHP/data.php");
    countryData = await response.json(); // Store the data globally
    console.log("Country data loaded:", countryData);
  } catch (error) {
    console.error("Error loading countries:", error);
  }
}

async function reverseGeocode(lat, lng) {
  const apiKey = "a4ccea8ecd8147fdb63d38ea593e3ff5"; // Replace with your OpenCage API key
  const url = `https://api.opencagedata.com/geocode/v1/json?q=${lat}+${lng}&key=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data.results && data.results.length > 0) {
      const country = data.results[0].components.country;
      return country;
    } else {
      console.error("No results found for reverse geocoding.");
      return null;
    }
  } catch (error) {
    console.error("Error during reverse geocoding:", error);
    return null;
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
      async (position) => {
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;

        // Set the map view to the user's location
        map.setView([userLat, userLng], 13); // Zoom level 13 for a closer view


        // Detect the user's country
        const country = await reverseGeocode(userLat, userLng);
        if (country) {
          // Update the dropdown list to reflect the user's country
          const countrySelect = document.getElementById("countrySelect");
          countrySelect.value = country;
          useSelectedCountry(); // Update the map and UI
        }
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

      currencyInfo();
      getAirports(countryData.features[i].properties.iso_a2);

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
  //initializeMap(); // Initialize the map with user's location or default view
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

        getWeather(entry.capital, countryName);
      } else {
        console.error("API status is not OK:", result.status);
      }
    },
    error: function (jqXHR, textStatus, errorThrown) {
      console.error("AJAX Error:", textStatus, errorThrown, jqXHR.responseText);
      console.log(jqXHR.responseText);
    },
  });
}

function getAirports(country) {
  $.ajax({
    method: "GET",
    url: "https://api.api-ninjas.com/v1/airports?country=" + country,
    headers: { "X-Api-Key": "OW44mw6RiogxF7XMVbmQAA==2hLu3UVY95smbCsI" },
    contentType: "application/json",
    success: function (result) {

      for (let i = 0; i < result.length; i++) {
        let lat = result[i].latitude;
        let lng = result[i].longitude;

        var redMarker = L.ExtraMarkers.icon({
          icon: "fa-plane",
          markerColor: "red",
          shape: "square",
          prefix: "fa",
        });

        L.marker([lat, lng], { icon: redMarker }).addTo(map);
      }
    },
    error: function ajaxError(jqXHR) {
      console.error("Error: ", jqXHR.responseText);
    },
  });
}

let currencyCodes = "";
function currencyInfo() {
  $.ajax({
    url: "./PHP/currencyExchange.php",
    type: "GET",
    dataType: "json",
    success: function (result) {
      if (result) {
        result = JSON.parse(result);

        //pushes all currency code keys to currencyCodeArray
        currencyCodes = result.rates;
        let currencyCodeArray = Object.keys(currencyCodes);

        let selectElements = document.querySelectorAll(".currency-converter");

        selectElements.forEach((select) => {
          // Create and append <option> elements
          currencyCodeArray.forEach((code) => {
            let option = document.createElement("option");
            option.value = code;
            option.textContent = code;
            select.appendChild(option);
          });
        });

        return currencyCodes;
      } else {
        console.error("API status is not OK:", result.status);
      }
    },
    error: function (jqXHR, textStatus, errorThrown) {
      console.error("AJAX Error:", textStatus, errorThrown, jqXHR.responseText);
      console.log(jqXHR.responseText);
    },
  });
}

document.getElementById("convert").addEventListener("click", convertCurrency);
function convertCurrency() {
  let rateA = document.getElementById("start-currency").value;
  let rateB = document.getElementById("end-currency").value;
  let amountA = document.getElementById("start-amount").value;

  let usdAmount = amountA / currencyCodes[rateA];

  if (rateB !== "USD") {
    let finalAmount = usdAmount * currencyCodes[rateB];
    document.getElementById("end-amount").value = finalAmount;
  } else {
    document.getElementById("end-amount").value = usdAmount;
  }
}

//Function to recieve weather data
function getWeather(capital, country) {
  $.ajax({
    url: `https://api.openweathermap.org/data/2.5/weather?q=${capital.toLowerCase()},${country.toLowerCase()}&APPID=f33a3fb8c17b7ef1026439ad7f3a27a2`,
    type: "GET",
    dataType: "json",

    success: function (result) {
      $("#weather-description").html(result.weather[0].description);
      $("#weather-icon").attr("src", `https://openweathermap.org/img/wn/${result.weather[0].icon}.png`);
      $("#temperature").html((result.main.temp - 273.15).toFixed(1));
      $("#feels-like").html((result.main.feels_like - 273.15).toFixed(1));
      $("#humidity").html(result.main.humidity);
      $("#wind-speed").html(result.wind.speed);
    },
    error: function (jqXHR, textStatus, errorThrown) {
      console.error("AJAX Error:", textStatus, errorThrown, jqXHR.responseText);
      console.log(jqXHR.responseText);
    },
  });
}

var streets = L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
  {
    attribution:
      "Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), TomTom, 2012",
  }
);

var satellite = L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  {
    attribution:
      "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
  }
);

var basemaps = {
  Streets: streets,
  Satellite: satellite,
};

// buttons

var infoBtn = L.easyButton("fa-info fa-xl", function (btn, map) {
  $("#exampleModal").modal("show");
});

var currencyBtn = L.easyButton("fa-coins fa-xl", function (btn, map) {
  $("#currencyConverterModal").modal("show");
});

var weatherBtn = L.easyButton("fa-cloud fa-xl", function (btn, map) {
  $("#weatherModal").modal("show");
});

// ---------------------------------------------------------
// EVENT HANDLERS
// ---------------------------------------------------------

// initialise and add controls once DOM is ready

$(document).ready(function () {
  initializeMap();
  // setView is not required in your application as you will be
  // deploying map.fitBounds() on the country border polygon

  let layerControl = L.control.layers(basemaps).addTo(map);

  infoBtn.addTo(map);
  currencyBtn.addTo(map);
  weatherBtn.addTo(map);
});
