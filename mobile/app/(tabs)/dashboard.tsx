import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useState, useCallback } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { NetWorthCard } from '../../components/NetWorthCard';
import { AccountsSummary } from '../../components/AccountsSummary';
import { RecentActivity } from '../../components/RecentActivity';

export default function DashboardScreen() {
  const { colors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // TODO: Fetch latest data from Supabase
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Text style={[styles.greeting, { color: colors.text }]}>
        Welcome back! 👋
      </Text>
      
      <NetWorthCard />
      
      <AccountsSummary />
      
      <RecentActivity />
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
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
});
