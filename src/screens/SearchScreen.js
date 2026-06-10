import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

export default function SearchScreen({ navigation }) {
  const [supplierType, setSupplierType] = useState('');
  const [location, setLocation] = useState('');
  const [material, setMaterial] = useState('');
  const [certifications, setCertifications] = useState('');

  const canSearch = supplierType.trim().length > 0 && location.trim().length > 0;

  const onSearch = () => {
    if (!canSearch) return;
    navigation.navigate('Results', {
      supplierType: supplierType.trim(),
      location: location.trim(),
      material: material.trim(),
      certifications: certifications.trim(),
    });
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#f6f8fa' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Nájdi svojho dodávateľa</Text>
        <Text style={styles.subtitle}>
          Zadaj kritériá a aplikácia vyhľadá firmy z Google Places.
        </Text>

        <Field
          label="Typ dodávateľa *"
          placeholder="napr. textilný výrobca, oceliareň, dodávateľ obalov"
          value={supplierType}
          onChangeText={setSupplierType}
        />

        <Field
          label="Lokalita *"
          placeholder="napr. Bratislava, Slovensko"
          value={location}
          onChangeText={setLocation}
        />

        <Field
          label="Typ látky / materiálu"
          placeholder="napr. bavlna, ľan, nehrdzavejúca oceľ"
          value={material}
          onChangeText={setMaterial}
        />

        <Field
          label="Požadované certifikácie"
          placeholder="napr. GOTS, ISO 9001, OEKO-TEX"
          value={certifications}
          onChangeText={setCertifications}
        />

        <TouchableOpacity
          style={[styles.button, !canSearch && styles.buttonDisabled]}
          onPress={onSearch}
          disabled={!canSearch}
        >
          <Text style={styles.buttonText}>Vyhľadať dodávateľov</Text>
        </TouchableOpacity>

        <Text style={styles.hint}>* povinné polia</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, ...props }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        placeholderTextColor="#8b949e"
        autoCapitalize="none"
        autoCorrect={false}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: '700', color: '#0d1117', marginTop: 8 },
  subtitle: { fontSize: 14, color: '#57606a', marginTop: 6, marginBottom: 20 },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#24292f', marginBottom: 6 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d0d7de',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0d1117',
  },
  button: {
    marginTop: 12,
    backgroundColor: '#1f6feb',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonDisabled: { backgroundColor: '#94a3b8' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  hint: { marginTop: 12, color: '#6e7781', fontSize: 12, textAlign: 'center' },
});
