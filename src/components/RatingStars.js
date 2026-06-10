import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function RatingStars({ rating = 0, size = 14 }) {
  const rounded = Math.round(rating * 2) / 2;
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    let char = '☆';
    if (rounded >= i) char = '★';
    else if (rounded + 0.5 === i) char = '⯨';
    stars.push(
      <Text key={i} style={[styles.star, { fontSize: size }]}>
        {char}
      </Text>
    );
  }
  return <View style={styles.row}>{stars}</View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  star: { color: '#f4b400', marginRight: 1 },
});
