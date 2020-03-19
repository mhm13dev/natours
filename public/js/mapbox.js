export function displayMap(locations) {
  mapboxgl.accessToken =
    'pk.eyJ1IjoiaGVyZW11YmFzaGlyIiwiYSI6ImNrN2hsbzU3bDA5MG8za2xwM3EyYXBqaTAifQ.wpZKS4Bvk90pmz5K3AhRnA';

  const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/light-v10',
    scrollZoom: false
  });

  const bounds = new mapboxgl.LngLatBounds();

  locations.forEach(loc => {
    const popup = new mapboxgl.Popup({
      offset: 40,
      closeOnClick: false
    })
      .setLngLat(loc.coordinates)
      .setHTML(`<p>Day ${loc.day}: ${loc.description}</p>`)
      .addTo(map);

    const el = document.createElement('div');
    el.className = 'marker';

    const marker = new mapboxgl.Marker({
      element: el,
      anchor: 'bottom'
    })
      .setLngLat(loc.coordinates)
      .addTo(map);

    bounds.extend(loc.coordinates);
  });

  map.fitBounds(bounds, {
    padding: {
      top: 200,
      bottom: 200,
      left: 100,
      right: 100
    }
  });
}
