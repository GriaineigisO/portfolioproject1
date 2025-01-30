// Fetch options from countryBorders.geo.json
fetch(
  "http://localhost/maarcisOdonon/portfolioproject1/PHP/data.php"
)
  .then((response) => response.text())
  .then((options) => console.log(options))
  .catch((error) => console.error("Error loading countries:", error));

//console.log(countryList)

//get coordinates of country selected from dropdown menu
let selectedCountry = document.getElementById("countrySelect").value;

var map = L.map("map").setView([51.505, -0.09], 13);

L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution:
    '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(map);
