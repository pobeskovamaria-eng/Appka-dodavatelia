import { GOOGLE_PLACES_API_KEY } from '../config';

const TEXT_SEARCH_URL =
  'https://maps.googleapis.com/maps/api/place/textsearch/json';
const DETAILS_URL = 'https://maps.googleapis.com/maps/api/place/details/json';

function buildQuery({ supplierType, location, material, certifications }) {
  const parts = [];
  if (supplierType) parts.push(supplierType.trim());
  if (material) parts.push(material.trim());
  if (certifications) parts.push(`certifikácia ${certifications.trim()}`);
  if (location) parts.push(location.trim());
  return parts.filter(Boolean).join(' ');
}

export async function searchSuppliers(params) {
  if (!GOOGLE_PLACES_API_KEY) {
    throw new Error(
      'Chýba Google Places API kľúč. Nastav ho v app.json (extra.googlePlacesApiKey) alebo cez EXPO_PUBLIC_GOOGLE_PLACES_API_KEY.'
    );
  }

  const query = buildQuery(params);
  const url = `${TEXT_SEARCH_URL}?query=${encodeURIComponent(
    query
  )}&language=sk&key=${GOOGLE_PLACES_API_KEY}`;

  const response = await fetch(url);
  const data = await response.json();

  if (data.status && data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error(data.error_message || `Chyba Places API: ${data.status}`);
  }

  return (data.results || []).map((r) => ({
    placeId: r.place_id,
    name: r.name,
    address: r.formatted_address,
    rating: r.rating,
    userRatingsTotal: r.user_ratings_total,
    businessStatus: r.business_status,
    location: r.geometry?.location,
  }));
}

export async function getSupplierDetail(placeId) {
  if (!GOOGLE_PLACES_API_KEY) {
    throw new Error('Chýba Google Places API kľúč.');
  }

  const fields = [
    'name',
    'formatted_address',
    'formatted_phone_number',
    'international_phone_number',
    'website',
    'rating',
    'user_ratings_total',
    'opening_hours',
    'url',
  ].join(',');

  const url = `${DETAILS_URL}?place_id=${placeId}&fields=${fields}&language=sk&key=${GOOGLE_PLACES_API_KEY}`;
  const response = await fetch(url);
  const data = await response.json();

  if (data.status !== 'OK') {
    throw new Error(data.error_message || `Chyba Places API: ${data.status}`);
  }

  const r = data.result;
  return {
    name: r.name,
    address: r.formatted_address,
    phone: r.formatted_phone_number || r.international_phone_number,
    website: r.website,
    rating: r.rating,
    userRatingsTotal: r.user_ratings_total,
    openingHours: r.opening_hours?.weekday_text,
    mapsUrl: r.url,
  };
}
