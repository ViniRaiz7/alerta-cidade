const LocationMap = (() => {
  let map;
  let marker;
  let geocodeRequestId = 0;

  const defaultCenter = [-14.235, -51.9253];

  function fields() {
    return {
      location: document.querySelector('input[name="location"]'),
      latitude: document.querySelector('input[name="latitude"]'),
      longitude: document.querySelector('input[name="longitude"]'),
    };
  }

  function setCoordinates(latitude, longitude, shouldReverseGeocode) {
    const currentFields = fields();
    if (!currentFields.latitude || !currentFields.longitude) return;

    currentFields.latitude.value = latitude.toFixed(6);
    currentFields.longitude.value = longitude.toFixed(6);
    currentFields.location.value = `Ponto selecionado: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    currentFields.latitude.dispatchEvent(new Event('input', { bubbles: true }));

    if (marker) marker.setLatLng([latitude, longitude]);
    if (shouldReverseGeocode) reverseGeocode(latitude, longitude);
  }

  async function reverseGeocode(latitude, longitude) {
    const currentFields = fields();
    if (!currentFields.location) return;
    const requestId = ++geocodeRequestId;

    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=18`, {
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) return;
      const result = await response.json();
      const address = result.display_name;
      if (address && requestId === geocodeRequestId) {
        currentFields.location.value = address.slice(0, 140);
        currentFields.location.dispatchEvent(new Event('input', { bubbles: true }));
      }
    } catch (error) {
      // O endereço digitado manualmente continua disponível sem geocodificação.
    }
  }

  function initialPosition() {
    const currentFields = fields();
    const latitude = Number(currentFields.latitude && currentFields.latitude.value);
    const longitude = Number(currentFields.longitude && currentFields.longitude.value);
    return Number.isFinite(latitude) && Number.isFinite(longitude) && latitude && longitude
      ? [latitude, longitude]
      : defaultCenter;
  }

  function init() {
    const element = document.getElementById('location-map');
    if (!element || typeof L === 'undefined') return;

    if (map) map.remove();
    const position = initialPosition();
    map = L.map(element).setView(position, position === defaultCenter ? 4 : 16);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    marker = L.marker(position, { draggable: true }).addTo(map);
    marker.on('dragend', event => {
      const point = event.target.getLatLng();
      setCoordinates(point.lat, point.lng, true);
    });
    map.on('click', event => setCoordinates(event.latlng.lat, event.latlng.lng, true));

    setTimeout(() => map.invalidateSize(), 0);
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      showToast('Seu navegador não oferece localização automática.', 'error');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      position => {
        const point = [position.coords.latitude, position.coords.longitude];
        if (map) map.setView(point, 17);
        setCoordinates(point[0], point[1], true);
      },
      () => showToast('Não foi possível acessar sua localização. Marque o ponto no mapa.', 'error'),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return { init, useCurrentLocation };
})();
