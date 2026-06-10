import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
} from 'react-native';

import { getSupplierDetail } from '../services/placesApi';
import RatingStars from '../components/RatingStars';

export default function SupplierDetailScreen({ route }) {
  const { placeId, fallback } = route.params;
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const d = await getSupplierDetail(placeId);
        if (!cancelled) setDetail(d);
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [placeId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1f6feb" />
      </View>
    );
  }

  const data = detail || fallback;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#f6f8fa' }} contentContainerStyle={{ padding: 16 }}>
      <View style={styles.card}>
        <Text style={styles.name}>{data.name}</Text>
        {typeof data.rating === 'number' && (
          <View style={styles.ratingRow}>
            <RatingStars rating={data.rating} />
            <Text style={styles.ratingText}>
              {data.rating.toFixed(1)}
              {data.userRatingsTotal ? ` • ${data.userRatingsTotal} hodnotení` : ''}
            </Text>
          </View>
        )}

        {error && <Text style={styles.warn}>Detaily sa nepodarilo načítať: {error}</Text>}

        <Row label="Adresa" value={data.address} />
        <Row
          label="Telefón"
          value={data.phone}
          onPress={data.phone ? () => Linking.openURL(`tel:${data.phone}`) : undefined}
        />
        <Row
          label="Web"
          value={data.website}
          onPress={data.website ? () => Linking.openURL(data.website) : undefined}
        />

        {data.openingHours?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.label}>Otváracie hodiny</Text>
            {data.openingHours.map((line) => (
              <Text key={line} style={styles.openingLine}>
                {line}
              </Text>
            ))}
          </View>
        )}

        {data.mapsUrl && (
          <TouchableOpacity
            style={styles.mapsButton}
            onPress={() => Linking.openURL(data.mapsUrl)}
          >
            <Text style={styles.mapsButtonText}>Otvoriť v Google Maps</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

function Row({ label, value, onPress }) {
  if (!value) return null;
  const content = (
    <View style={styles.section}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, onPress && styles.link]}>{value}</Text>
    </View>
  );
  return onPress ? <TouchableOpacity onPress={onPress}>{content}</TouchableOpacity> : content;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#d0d7de',
  },
  name: { fontSize: 20, fontWeight: '700', color: '#0d1117' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  ratingText: { marginLeft: 8, color: '#57606a', fontSize: 13 },
  section: { marginTop: 14 },
  label: { fontSize: 12, fontWeight: '600', color: '#57606a', textTransform: 'uppercase' },
  value: { fontSize: 15, color: '#0d1117', marginTop: 2 },
  link: { color: '#1f6feb' },
  openingLine: { fontSize: 14, color: '#0d1117', marginTop: 2 },
  warn: { marginTop: 8, color: '#9a6700', fontSize: 13 },
  mapsButton: {
    marginTop: 20,
    backgroundColor: '#1f6feb',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  mapsButtonText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});
