import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';

export default function Cabs() {
  const { theme } = useTheme();
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>
          Cabs Service
        </Text>
        
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>
            Book Your Ride
          </Text>
          <Text style={[styles.cardText, { color: theme.textSecondary }]}>
            Choose from our fleet of comfortable and reliable vehicles
          </Text>
          
          <View style={styles.options}>
            <View style={[styles.option, { backgroundColor: theme.isDark ? '#1e3a8a' : '#dbeafe' }]}>
              <Text style={[styles.optionTitle, { color: theme.isDark ? '#93c5fd' : '#1e40af' }]}>Economy</Text>
              <Text style={[styles.optionPrice, { color: theme.isDark ? '#60a5fa' : '#2563eb' }]}>Starting at ₹10/km</Text>
            </View>
            
            <View style={[styles.option, { backgroundColor: theme.isDark ? '#064e3b' : '#d1fae5', marginTop: 12 }]}>
              <Text style={[styles.optionTitle, { color: theme.isDark ? '#6ee7b7' : '#065f46' }]}>Premium</Text>
              <Text style={[styles.optionPrice, { color: theme.isDark ? '#34d399' : '#059669' }]}>Starting at ₹15/km</Text>
            </View>
            
            <View style={[styles.option, { backgroundColor: theme.isDark ? '#581c87' : '#f3e8ff', marginTop: 12 }]}>
              <Text style={[styles.optionTitle, { color: theme.isDark ? '#d8b4fe' : '#6b21a8' }]}>Luxury</Text>
              <Text style={[styles.optionPrice, { color: theme.isDark ? '#c084fc' : '#7c3aed' }]}>Starting at ₹25/km</Text>
            </View>
          </View>
        </View>
        
        <View style={[styles.card, { backgroundColor: theme.surface, marginTop: 16 }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>
            Features
          </Text>
          <Text style={[styles.feature, { color: theme.textSecondary }]}>• 24/7 Availability</Text>
          <Text style={[styles.feature, { color: theme.textSecondary }]}>• GPS Tracking</Text>
          <Text style={[styles.feature, { color: theme.textSecondary }]}>• Professional Drivers</Text>
          <Text style={[styles.feature, { color: theme.textSecondary }]}>• Safe & Sanitized Vehicles</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 24, textAlign: 'center' },
  card: { borderRadius: 12, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  cardTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
  cardText: { fontSize: 14, marginBottom: 16, lineHeight: 20 },
  options: { marginTop: 8 },
  option: { padding: 16, borderRadius: 10 },
  optionTitle: { fontWeight: '600', fontSize: 15 },
  optionPrice: { fontSize: 14, marginTop: 4 },
  feature: { fontSize: 14, marginBottom: 8, lineHeight: 20 },
});