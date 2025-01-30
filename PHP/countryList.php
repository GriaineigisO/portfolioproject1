<?php


header("Access-Control-Allow-Origin: *"); 
header("Access-Control-Allow-Methods: GET, POST, OPTIONS"); 
header("Access-Control-Allow-Headers: Content-Type"); 

header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Cache-Control: post-check=0, pre-check=0", false);
header("Pragma: no-cache");
header("Expires: 0");
header("Content-Type: text/html; charset=UTF-8");

$jsonFilePath = __DIR__ . '/../countryBorders.geo.json';
$countryList = file_get_contents($jsonFilePath);

$data = json_decode($countryList, true);

$countryNames = [];


foreach ($data['features'] as $country) {
    if (isset($country['properties']['name'])) {
        $name = htmlspecialchars($country['properties']['name'], ENT_QUOTES, 'UTF-8');
        $countryNames[] = $name;
    }
}

// Sort the country names alphabetically
sort($countryNames, SORT_STRING);


$options = '';

foreach ($countryNames as $name) {
    $options .= "<option value=\"$name\">$name</option>";
}

echo $options;






