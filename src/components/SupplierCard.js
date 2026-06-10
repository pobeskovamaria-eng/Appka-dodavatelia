import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

import RatingStars from './RatingStars';

export default function SupplierCard({ supplier, onPress }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <Text style={styles.name} numberOfLines={2}>
        {supplier.name}
      </Text>

      {supplier.address && (
        <Text style={styles.address} numberOfLines={2}>
          {supplier.address}
        </Text>
      )}

      <View style={styles.footer}>
        {typeof supplier.rating === 'number' ? (
          <View style={styles.ratingRow}>
            <RatingStars rating={supplier.rating} />
            <Text style={styles.ratingText}>
              {supplier.rating.toFixed(1)}
              {supplier.userRatingsTotal ? ` (${supplier.userRatingsTotal})` : ''}
            </Text>
          </View>
        ) : (
          <Text style={styles.noRating}>Bez hodnotenia</Text>
        )}
        <Text style={styles.cta}>Detail ›</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#d0d7de',
  },
  name: { fontSize: 16, fontWeight: '700', color: '#0d1117' },
  address: { fontSize: 13, color: '#57606a', marginTop: 4 },
  footer: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ratingRow: { flexDirection: 'row', alignItems: 'center' },
  ratingText: { marginLeft: 6, color: '#57606a', fontSize: 13 },
  noRating: { color: '#8b949e', fontSize: 13, fontStyle: 'italic' },
  cta: { color: '#1f6feb', fontWeight: '600', fontSize: 13 },
});
