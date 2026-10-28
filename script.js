const map = L.map("map").setView([48.0, -123.0], 8);

// Street basemap
const streetMap = L.tileLayer(
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  {
    attribution: "&copy; OpenStreetMap contributors",
    maxZoom: 19
  }
).addTo(map);

// Satellite basemap
const satelliteMap = L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  {
    attribution: "Imagery &copy; Esri",
    maxZoom: 19
  }
);

// Create separate species layers
const seaLionLayer = L.layerGroup().addTo(map);
const harborSealLayer = L.layerGroup().addTo(map);

// Create colored markers
function createMarker(feature, color) {
  const coordinates = feature.geometry.coordinates;
  const properties = feature.properties;

  return L.circleMarker(
    [coordinates[1], coordinates[0]],
    {
      radius: 6,
      color: color,
      fillColor: color,
      fillOpacity: 0.8,
      weight: 1
    }
  ).bindPopup(`
    <strong>${properties.biofile_NAME}</strong><br>
    Record ID: ${properties.OBJECTID}<br>
    Latitude: ${coordinates[1].toFixed(5)}<br>
    Longitude: ${coordinates[0].toFixed(5)}
  `);
}

// Load both JSON datasets
Promise.all([
  fetch("sea-lions.json").then(response => {
    if (!response.ok) throw new Error("Could not load sea-lions.json");
    return response.json();
  }),
  fetch("harbor-seals.json").then(response => {
    if (!response.ok) throw new Error("Could not load harbor-seals.json");
    return response.json();
  })
])
.then(([seaLions, harborSeals]) => {

  const bounds = L.latLngBounds([]);

  // California sea lions: orange
  seaLions.features.forEach(feature => {
    const marker = createMarker(feature, "#e67e22");
    marker.addTo(seaLionLayer);
    bounds.extend(marker.getLatLng());
  });

  // Harbor seals: blue
  harborSeals.features.forEach(feature => {
    const marker = createMarker(feature, "#2563eb");
    marker.addTo(harborSealLayer);
    bounds.extend(marker.getLatLng());
  });

  // Zoom to all locations
  if (bounds.isValid()) {
    map.fitBounds(bounds, { padding: [25, 25] });
  }

  // Spatial analysis
  const lionCount = seaLions.features.length;
  const sealCount = harborSeals.features.length;

  // Calculate latitude ranges for each species
  function latitudeRange(features) {
    const latitudes = features.map(
      feature => feature.geometry.coordinates[1]
    );

    return {
      min: Math.min(...latitudes),
      max: Math.max(...latitudes)
    };
  }

  const lionRange = latitudeRange(seaLions.features);
  const sealRange = latitudeRange(harborSeals.features);

  // Compare the latitude ranges
  const overlapMin = Math.max(lionRange.min, sealRange.min);
  const overlapMax = Math.min(lionRange.max, sealRange.max);

  const overlapText = overlapMin <= overlapMax
    ? `The two datasets overlap in latitude between
       ${overlapMin.toFixed(2)}°N and ${overlapMax.toFixed(2)}°N.`
    : "The two datasets do not overlap in latitude.";

  // Display dataset descriptions and analysis
  document.getElementById("results").innerHTML = `
    <h3>Datasets</h3>

    <p>
      <strong>California Sea Lions:</strong>
      This dataset contains ${lionCount} mapped location records
      for California sea lions in Washington State.
      The orange markers show their geographic locations.
    </p>

    <p>
      <strong>Harbor Seals:</strong>
      This dataset contains ${sealCount} mapped location records
      for harbor seals in Washington State.
      The blue markers show their geographic locations.
    </p>

    <h3>Spatial Analysis</h3>

    <p>
      I compared the geographic distribution of the two species
      by reviewing their mapped locations and latitude ranges.
      California sea lion records extend from
      ${lionRange.min.toFixed(2)}°N to
      ${lionRange.max.toFixed(2)}°N,
      while harbor seal records extend from
      ${sealRange.min.toFixed(2)}°N to
      ${sealRange.max.toFixed(2)}°N.
      ${overlapText}
    </p>

    <p>
      Harbor seals have more mapped records in this dataset,
      and their locations extend farther north.
      The overlapping latitude ranges suggest that both
      species are represented within some of the same
      north to south portions of Washington State.
      One call out, this does not necessarily mean they occupy
      the same exact locations.
    </p>

    <p>
      <em>
        These counts represent mapped records,
        not estimates of animal population size.
      </em>
    </p>
  `;
    })
.catch(error => {
  console.error(error);
  document.getElementById("results").textContent =
    "unable to load the datasets.";
});

// Layer controls
L.control.layers(
  {
    "Street Map": streetMap,
    "Satellite": satelliteMap
  },
  {
    "California Sea Lions": seaLionLayer,
    "Harbor Seals": harborSealLayer
  },
  { collapsed: false }
).addTo(map);

// Legend
const legend = L.control({ position: "bottomright" });

legend.onAdd = function() {
  const div = L.DomUtil.create("div");

  div.style.background = "white";
  div.style.padding = "10px";
  div.style.borderRadius = "5px";
  div.style.boxShadow = "0 1px 5px rgba(0,0,0,0.3)";

  div.innerHTML = `
    <strong>Species</strong><br>
    <span style="color:#e67e22;">●</span> California Sea Lion<br>
    <span style="color:#2563eb;">●</span> Harbor Seal
  `;

  return div;
};

legend.addTo(map);