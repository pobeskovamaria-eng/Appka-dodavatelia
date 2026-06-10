import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';

import { searchSuppliers } from '../services/placesApi';
import SupplierCard from '../components/SupplierCard';

export default function ResultsScreen({ route, navigation }) {
  const { supplierType, location, material, certifications } = route.params;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [suppliers, setSuppliers] = useState([]);

  const load = useCallback(async () => {
    setError(null);
    try {
      const results = await searchSuppliers({
        supplierType,
        location,
        material,
        certifications,
      });
      setSuppliers(results);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [supplierType, location, material, certifications]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1f6feb" />
        <Text style={styles.loadingText}>Vyhľadávam dodávateľov…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Vyhľadávanie zlyhalo</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retry} onPress={load}>
          <Text style={styles.retryText}>Skúsiť znova</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f6f8fa' }}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {suppliers.length} {pluralizeResults(suppliers.length)}
        </Text>
        <Text style={styles.headerSubtitle} numberOfLines={2}>
          {buildSummary({ supplierType, location, material, certifications })}
        </Text>
      </View>

      <FlatList
        data={suppliers}
        keyExtractor={(item) => item.placeId}
        renderItem={({ item }) => (
          <SupplierCard
            supplier={item}
            onPress={() =>
              navigation.navigate('SupplierDetail', {
                placeId: item.placeId,
                fallback: item,
              })
            }
          />
        )}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>
              Žiadne výsledky. Skús upraviť kritériá.
            </Text>
          </View>
        }
      />
    </View>
  );
}

function pluralizeResults(n) {
  if (n === 1) return 'výsledok';
  if (n >= 2 && n <= 4) return 'výsledky';
  return 'výsledkov';
}

function buildSummary({ supplierType, location, material, certifications }) {
  const parts = [supplierType, location];
  if (material) parts.push(material);
  if (certifications) parts.push(certifications);
  return parts.filter(Boolean).join(' • ');
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  loadingText: { marginTop: 12, color: '#57606a' },
  errorTitle: { fontSize: 17, fontWeight: '700', color: '#cf222e', marginBottom: 8 },
  errorText: { color: '#57606a', textAlign: 'center' },
  retry: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#1f6feb',
    borderRadius: 8,
  },
  retryText: { color: '#fff', fontWeight: '600' },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#d0d7de',
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#0d1117' },
  headerSubtitle: { fontSize: 13, color: '#57606a', marginTop: 2 },
  emptyText: { color: '#57606a' },
});
