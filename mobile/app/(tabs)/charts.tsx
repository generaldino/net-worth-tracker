import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ChartsScreen() {
  const { colors } = useTheme();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Net Worth Over Time */}
      <View style={[styles.chartCard, { backgroundColor: colors.card }]}>
        <Text style={[styles.chartTitle, { color: colors.text }]}>
          Net Worth Over Time
        </Text>
        <View style={styles.chartPlaceholder}>
          <Ionicons name="trending-up" size={48} color={colors.primary} />
          <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>
            Chart visualization coming soon
          </Text>
          <Text style={[styles.placeholderSubtext, { color: colors.textSecondary }]}>
            Connect to see your net worth growth
          </Text>
        </View>
      </View>

      {/* Asset Allocation */}
      <View style={[styles.chartCard, { backgroundColor: colors.card }]}>
        <Text style={[styles.chartTitle, { color: colors.text }]}>
          Asset Allocation
        </Text>
        <View style={styles.chartPlaceholder}>
          <Ionicons name="pie-chart" size={48} color={colors.primary} />
          <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>
            Pie chart visualization
          </Text>
        </View>
      </View>

      {/* Monthly Comparison */}
      <View style={[styles.chartCard, { backgroundColor: colors.card }]}>
        <Text style={[styles.chartTitle, { color: colors.text }]}>
          Monthly Comparison
        </Text>
        <View style={styles.chartPlaceholder}>
          <Ionicons name="bar-chart" size={48} color={colors.primary} />
          <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>
            Bar chart visualization
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  chartCard: {
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  chartPlaceholder: {
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  placeholderText: {
    fontSize: 16,
    fontWeight: '500',
  },
  placeholderSubtext: {
    fontSize: 14,
  },
});
