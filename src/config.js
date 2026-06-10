import Constants from 'expo-constants';

export const GOOGLE_PLACES_API_KEY =
  Constants?.expoConfig?.extra?.googlePlacesApiKey ||
  process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY ||
  '';
