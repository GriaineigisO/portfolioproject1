let countryData = null;
let countryOutlineLayer = null;
let map;

// Fetch country data and store it globally
async function fetchCountries() {
  try {
    const response = await fetch("./PHP/data.php");
    countryData = await response.json(); // Store the data globally
  } catch (error) {
    console.error("Error loading countries:", error);
  }
}

function reverseGeocode(lat, lng) {
  return new Promise((resolve, reject) => {
    $.ajax({
      url: "./PHP/reverseGeocode.php",
      type: "GET",
      dataType: "json",
      data: { lat, lng },
      success: function (result) {
        const country = result.data.results[0].components.country;
        resolve(country);
      },
      error: reject,
    });
  });
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
      wikipedia(countryData.features[i].properties.name);
      newsData(countryData.features[i].properties.name);

      // Remove previous outline if it exists
      if (countryOutlineLayer) {
        map.removeLayer(countryOutlineLayer);
      }

      // Add new country outline
      countryOutlineLayer = L.geoJSON(countryData.features[i], {
        style: {
          color: "blue", // Outline color
          weight: 2, // Border thickness
          fillOpacity: 0, // No fill, only outline
        },
      }).addTo(map);

      // Handle Polygon or MultiPolygon
      if (geometry.type === "Polygon" || geometry.type === "MultiPolygon") {
        const feature = turf.feature(geometry); // Create a Turf feature
        const bbox = turf.bbox(feature); // Get bounding box
        map.fitBounds([
          [bbox[1], bbox[0]],
          [bbox[3], bbox[2]],
        ]); // Fit map to bounds
        getEarthquakes(bbox[3], bbox[2], bbox[1], bbox[0]);
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

        getWeather(entry.capital, countryName, entry.countryCode);
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

let airportLayer = L.markerClusterGroup(); // Global layer to store airport markers

function getAirports(country) {
  // Clear previous airport markers to avoid duplicates
  airportLayer.clearLayers();

  $.ajax({
    method: "GET",
    url: "./PHP/airports.php",
    contentType: "application/json",
    data: {
      country: country,
    },
    success: function (result) {
      for (let i = 0; i < result.data.length; i++) {
        let lat = result.data[i].latitude;
        let lng = result.data[i].longitude;

        let redMarker = L.ExtraMarkers.icon({
          icon: "fa-plane",
          markerColor: "red",
          shape: "square",
          prefix: "fa",
        });

        let marker = L.marker([lat, lng], { icon: redMarker });

        let popupContent = `
          <strong>Name:</strong> ${result.data[i].name}<br>
          <strong>City:</strong> ${result.data[i].city}<br>
          <strong>Country:</strong> ${result.data[i].country}
        `;

        // Bind popup to marker and add click event
        marker.bindPopup(popupContent);

        airportLayer.addLayer(marker);
      }
    },
    error: function ajaxError(jqXHR) {
      console.error("Error: ", jqXHR.responseText);
    },
  });
}

let earthquakeLayer = L.markerClusterGroup(); // Global layer to store airport markers
function getEarthquakes(north, east, south, west) {
  // Clear previous markers to avoid duplicates
  earthquakeLayer.clearLayers();

  $.ajax({
    method: "GET",
    url: `./PHP/earthquake.php`,
    dataType: "json",
    data: {
      north: north,
      south: south,
      west: west,
      east: east,
    },
    success: function (result) {
      for (let i = 0; i < result.data.earthquakes.length; i++) {
        let lat = result.data.earthquakes[i].lat;
        let lng = result.data.earthquakes[i].lng;
        let redMarker = L.ExtraMarkers.icon({
          icon: "fa-house-crack",
          markerColor: "red",
          shape: "square",
          prefix: "fa",
        });

        let marker = L.marker([lat, lng], { icon: redMarker });

        let popupContent = `
          <strong>Date:</strong> ${result.data.earthquakes[i].datetime}<br>
          <strong>Magnitude:</strong> ${result.data.earthquakes[i].magnitude}<br>
          <strong>Depth:</strong> ${result.data.earthquakes[i].depth} km
        `;

        // Bind popup to marker and add click event
        marker.bindPopup(popupContent);

        earthquakeLayer.addLayer(marker);
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

function wikipedia(place) {
  $.ajax({
    url: "./PHP/wikipedia.php",
    type: "GET",
    dataType: "json",
    data: {
      place: place,
    },
    success: function (result) {
      if (result) {
        for (let i = 0; i < result.data.entry.length; i++) {
          if (result.data.entry[i].title === place) {
            $("#wikipedia-title").html(result.data.entry[i].title);
            $("#wikipedia-description").html(result.data.entry[i].summary);
            $("#wikipedia-thumbnail").attr(
              "src",
              `${result.data.entry[i].thumbnailImg}`
            );
            $("#wikipedia-link").attr(
              "href",
              `${result.data.entry[i].wikipediaUrl}`
            );
          }
        }
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

function newsData(place) {
  $.ajax({
    url: "./PHP/newsData.php",
    type: "GET",
    dataType: "json",
    data: {
      place: place,
    },
    success: function (result) {
      if (result) {
        let newsModalBody = document.getElementById("newsModalBody");
        newsModalBody.replaceChildren();
        for (let i = 0; i < result.data.results.length; i++) {
          if (result.data.results[i].country.includes(place.toLowerCase())) {
            let newsDiv = document.createElement("div");
            newsDiv.setAttribute("class", "newsDiv");

            let newsTitle = document.createElement("h6");
            newsTitle.innerHTML = result.data.results[i].title;
            newsTitle.setAttribute("class", "newsTitle");

            let newsImage = document.createElement("img");
            newsImage.setAttribute("src", result.data.results[i].image_url);
            newsImage.setAttribute("class", "newsImage");

            let newsDescription = document.createElement("p");
            newsDescription.innerHTML = result.data.results[i].description;
            newsDescription.setAttribute("class", "newsDescription");

            let newsDate = document.createElement("p");
            newsDate.innerHTML = result.data.results[i].pubDate;
            newsDate.setAttribute("class", "newsDate");

            let newsSource = document.createElement("p");
            newsSource.innerHTML = result.data.results[i].source_name;
            newsSource.setAttribute("class", "newsSource");

            let newsButton = document.createElement("button");
            newsButton.addEventListener("click", () => {
              let redirectWindow = window.open(
                result.data.results[i].link,
                "_blank"
              );
              redirectWindow.location;
            });
            newsButton.setAttribute("class", "newsButton");
            newsButton.innerHTML = "Click Here For Full Article";

            newsDiv.appendChild(newsImage);
            newsDiv.appendChild(newsTitle);
            newsDiv.appendChild(newsDescription);
            newsDiv.appendChild(newsDate);
            newsDiv.appendChild(newsSource);
            newsDiv.appendChild(newsButton);
            newsModalBody.appendChild(newsDiv);
          }
        }
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

document
  .getElementById("start-amount")
  .addEventListener("input", convertCurrency);
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
function getWeather(capital, country, countryCode) {
  $.ajax({
    url: `./PHP/weather.php`,
    type: "GET",
    dataType: "json",
    data: {
      // lat: lat,
      // lng: long,
      capital: capital,
    },

    success: function (result) {
      $("#weather-description").html(result.data.current.condition.text);
      $("#weather-icon").attr("src", `${result.data.current.condition.icon}`);
      $("#temperature").html(result.data.current.temp_c.toFixed(1));
      $("#feels-like").html(result.data.current.feelslike_c.toFixed(1));
      $("#humidity").html(result.data.current.humidity);
    },
    error: function (jqXHR, textStatus, errorThrown) {
      console.error("AJAX Error:", textStatus, errorThrown, jqXHR.responseText);
      console.log(jqXHR.responseText);
    },
  });

  $.ajax({
    url: `./PHP/forecastWeather.php`,
    type: "GET",
    dataType: "json",
    data: {
      capital: capital,
    },

    success: function (result) {
      let forecastDiv = document.getElementById("forecast-div");
      forecastDiv.replaceChildren();
      for (
        let i = 0;
        i < result.data.forecast.forecastday[0].hour.length;
        i++
      ) {
        //check what the current time is, so the forecast only shows data for future hours
        if (
          result.data.current.last_updated_epoch <
          result.data.forecast.forecastday[0].hour[i].time_epoch
        ) {
          let forecastBox = document.createElement("div");
          forecastBox.setAttribute("class", "forecast-box");
          let time = document.createElement("h6");
          time.innerHTML = result.data.forecast.forecastday[0].hour[i].time;
          let icon = document.createElement("img");
          icon.setAttribute(
            "src",
            result.data.forecast.forecastday[0].hour[i].condition.icon
          );
          let description = document.createElement("p");
          description.innerHTML =
            result.data.forecast.forecastday[0].hour[i].condition.text;
          let temp = document.createElement("p");
          temp.innerHTML = `Temp: ${result.data.forecast.forecastday[0].hour[i].temp_c}°C `;
          let chanceOfRain = document.createElement("p");
          chanceOfRain.innerHTML = `Chance of rain: ${result.data.forecast.forecastday[0].hour[i].chance_of_rain}%`;
          let humidity = document.createElement("p");
          humidity.innerHTML = `Humidity: ${result.data.forecast.forecastday[0].hour[i].humidity}%`;

          let iconDiv = document.createElement("div");
          iconDiv.setAttribute("class", "icon-div");
          iconDiv.appendChild(icon);
          iconDiv.appendChild(description);

          let tempDiv = document.createElement("div");
          tempDiv.setAttribute("class", "temp-div");
          tempDiv.appendChild(temp);
          tempDiv.appendChild(chanceOfRain);
          tempDiv.appendChild(humidity);

          forecastBox.appendChild(time);
          forecastBox.appendChild(iconDiv);
          forecastBox.appendChild(tempDiv);
          forecastDiv.appendChild(forecastBox);
        }
      }
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

var overlays = {
  Airports: airportLayer,
  Earthquakes: earthquakeLayer,
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

var wikipediaBtn = L.easyButton(
  "fa-brands fa-wikipedia-w fa-xl",
  function (btn, map) {
    $("#wikipediaModal").modal("show");
  }
);

var newsBtn = L.easyButton("fa-newspaper fa-xl", function (btn, map) {
  $("#newsModal").modal("show");
});

// ---------------------------------------------------------
// EVENT HANDLERS
// ---------------------------------------------------------

// initialise and add controls once DOM is ready

$(document).ready(function () {
  initializeMap();

  L.control.layers(basemaps, overlays).addTo(map);

  infoBtn.addTo(map);
  currencyBtn.addTo(map);
  weatherBtn.addTo(map);
  wikipediaBtn.addTo(map);
  newsBtn.addTo(map);
});
