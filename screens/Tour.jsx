import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';

export default function Tour() {
  const { theme, isDark } = useTheme();
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>
          Tour Services
        </Text>
        
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>
            Guided Tours
          </Text>
          <Text style={[styles.cardText, { color: theme.textSecondary }]}>
            Explore with expert local guides and discover hidden gems
          </Text>
          
          <View style={styles.tours}>
            <View style={[styles.tour, { backgroundColor: isDark ? '#713f12' : '#fef3c7', borderLeftWidth: 4, borderLeftColor: isDark ? '#fbbf24' : '#f59e0b' }]}>
              <Text style={[styles.tourTitle, { color: isDark ? '#fcd34d' : '#92400e' }]}>City Walking Tours</Text>
              <Text style={[styles.tourSubtitle, { color: isDark ? '#fbbf24' : '#b45309' }]}>Historical & Cultural Sites</Text>
              <Text style={[styles.tourDuration, { color: isDark ? '#fbbf24' : '#d97706' }]}>Duration: 3-4 hours</Text>
              <Text style={[styles.tourPrice, { color: isDark ? '#fcd34d' : '#92400e' }]}>₹299 per person</Text>
            </View>
            
            <View style={[styles.tour, { backgroundColor: isDark ? '#312e81' : '#e0e7ff', borderLeftWidth: 4, borderLeftColor: isDark ? '#818cf8' : '#6366f1', marginTop: 16 }]}>
              <Text style={[styles.tourTitle, { color: isDark ? '#a5b4fc' : '#3730a3' }]}>Heritage Tours</Text>
              <Text style={[styles.tourSubtitle, { color: isDark ? '#818cf8' : '#4338ca' }]}>Monuments & Palaces</Text>
              <Text style={[styles.tourDuration, { color: isDark ? '#818cf8' : '#4f46e5' }]}>Duration: Full Day</Text>
              <Text style={[styles.tourPrice, { color: isDark ? '#a5b4fc' : '#3730a3' }]}>₹899 per person</Text>
            </View>
            
            <View style={[styles.tour, { backgroundColor: isDark ? '#134e4a' : '#ccfbf1', borderLeftWidth: 4, borderLeftColor: isDark ? '#2dd4bf' : '#14b8a6', marginTop: 16 }]}>
              <Text style={[styles.tourTitle, { color: isDark ? '#5eead4' : '#134e4a' }]}>Nature Tours</Text>
              <Text style={[styles.tourSubtitle, { color: isDark ? '#2dd4bf' : '#115e59' }]}>Wildlife & Landscapes</Text>
              <Text style={[styles.tourDuration, { color: isDark ? '#2dd4bf' : '#0f766e' }]}>Duration: 2-3 days</Text>
              <Text style={[styles.tourPrice, { color: isDark ? '#5eead4' : '#134e4a' }]}>₹2,499 per person</Text>
            </View>
            
            <View style={[styles.tour, { backgroundColor: isDark ? '#881337' : '#ffe4e6', borderLeftWidth: 4, borderLeftColor: isDark ? '#fb7185' : '#f43f5e', marginTop: 16 }]}>
              <Text style={[styles.tourTitle, { color: isDark ? '#fda4af' : '#881337' }]}>Adventure Tours</Text>
              <Text style={[styles.tourSubtitle, { color: isDark ? '#fb7185' : '#9f1239' }]}>Trekking & Water Sports</Text>
              <Text style={[styles.tourDuration, { color: isDark ? '#fb7185' : '#be123c' }]}>Duration: Customizable</Text>
              <Text style={[styles.tourPrice, { color: isDark ? '#fda4af' : '#881337' }]}>Starting ₹1,999</Text>
            </View>
          </View>
        </View>
        
        <View style={[styles.card, { backgroundColor: theme.surface, marginTop: 16 }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>
            Tour Features
          </Text>
          <Text style={[styles.feature, { color: theme.textSecondary }]}>• Expert Local Guides</Text>
          <Text style={[styles.feature, { color: theme.textSecondary }]}>• Small Group Experience</Text>
          <Text style={[styles.feature, { color: theme.textSecondary }]}>• Photography Assistance</Text>
          <Text style={[styles.feature, { color: theme.textSecondary }]}>• Cultural Insights</Text>
          <Text style={[styles.feature, { color: theme.textSecondary }]}>• Flexible Itineraries</Text>
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
  tours: { marginTop: 8 },
  tour: { padding: 16, borderRadius: 10 },
  tourTitle: { fontWeight: 'bold', fontSize: 16 },
  tourSubtitle: { fontSize: 13, marginTop: 4 },
  tourDuration: { fontSize: 13, marginTop: 2 },
  tourPrice: { fontSize: 14, fontWeight: '600', marginTop: 6 },
  feature: { fontSize: 14, marginBottom: 8, lineHeight: 20 },
});