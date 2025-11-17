import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';

export default function Holidays() {
  const { theme, isDark } = useTheme();
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>
          Holiday Packages
        </Text>
        
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>
            Popular Destinations
          </Text>
          <Text style={[styles.cardText, { color: theme.textSecondary }]}>
            Discover amazing places with our curated holiday packages
          </Text>
          
          <View style={styles.packages}>
            <View style={[styles.package, { backgroundColor: isDark ? '#1e3a8a' : '#dbeafe' }]}>
              <Text style={[styles.packageTitle, { color: isDark ? '#93c5fd' : '#1e40af' }]}>Goa Beach Holiday</Text>
              <Text style={[styles.packageDuration, { color: isDark ? '#60a5fa' : '#2563eb' }]}>3 Days / 2 Nights</Text>
              <Text style={[styles.packagePrice, { color: isDark ? '#3b82f6' : '#1d4ed8' }]}>Starting ₹8,999</Text>
            </View>
            
            <View style={[styles.package, { backgroundColor: isDark ? '#064e3b' : '#d1fae5', marginTop: 16 }]}>
              <Text style={[styles.packageTitle, { color: isDark ? '#6ee7b7' : '#065f46' }]}>Kerala Backwaters</Text>
              <Text style={[styles.packageDuration, { color: isDark ? '#34d399' : '#059669' }]}>4 Days / 3 Nights</Text>
              <Text style={[styles.packagePrice, { color: isDark ? '#10b981' : '#047857' }]}>Starting ₹12,999</Text>
            </View>
            
            <View style={[styles.package, { backgroundColor: isDark ? '#7c2d12' : '#fed7aa', marginTop: 16 }]}>
              <Text style={[styles.packageTitle, { color: isDark ? '#fdba74' : '#9a3412' }]}>Rajasthan Heritage</Text>
              <Text style={[styles.packageDuration, { color: isDark ? '#fb923c' : '#c2410c' }]}>6 Days / 5 Nights</Text>
              <Text style={[styles.packagePrice, { color: isDark ? '#f97316' : '#ea580c' }]}>Starting ₹18,999</Text>
            </View>
            
            <View style={[styles.package, { backgroundColor: isDark ? '#581c87' : '#f3e8ff', marginTop: 16 }]}>
              <Text style={[styles.packageTitle, { color: isDark ? '#d8b4fe' : '#6b21a8' }]}>Himachal Adventure</Text>
              <Text style={[styles.packageDuration, { color: isDark ? '#c084fc' : '#7c3aed' }]}>5 Days / 4 Nights</Text>
              <Text style={[styles.packagePrice, { color: isDark ? '#a855f7' : '#9333ea' }]}>Starting ₹15,999</Text>
            </View>
          </View>
        </View>
        
        <View style={[styles.card, { backgroundColor: theme.surface, marginTop: 16 }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>
            Package Includes
          </Text>
          <Text style={[styles.feature, { color: theme.textSecondary }]}>• Accommodation</Text>
          <Text style={[styles.feature, { color: theme.textSecondary }]}>• Transportation</Text>
          <Text style={[styles.feature, { color: theme.textSecondary }]}>• Meals (as per package)</Text>
          <Text style={[styles.feature, { color: theme.textSecondary }]}>• Sightseeing</Text>
          <Text style={[styles.feature, { color: theme.textSecondary }]}>• Tour Guide</Text>
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
  packages: { marginTop: 8 },
  package: { padding: 16, borderRadius: 10 },
  packageTitle: { fontWeight: 'bold', fontSize: 16 },
  packageDuration: { fontSize: 13, marginTop: 4 },
  packagePrice: { fontSize: 14, fontWeight: '600', marginTop: 4 },
  feature: { fontSize: 14, marginBottom: 8, lineHeight: 20 },
});