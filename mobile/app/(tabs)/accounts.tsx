import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { AccountCard } from '../../components/AccountCard';

// Mock data - will be replaced with Supabase data
const MOCK_ACCOUNTS = [
  { id: '1', name: 'Savings Account', type: 'savings', balance: 15000, currency: 'USD' },
  { id: '2', name: 'Investment Portfolio', type: 'investment', balance: 45000, currency: 'USD' },
  { id: '3', name: 'Retirement Fund', type: 'retirement', balance: 120000, currency: 'USD' },
  { id: '4', name: 'Credit Card', type: 'credit', balance: -2500, currency: 'USD' },
  { id: '5', name: 'Property', type: 'property', balance: 350000, currency: 'USD' },
];

type AccountType = 'all' | 'savings' | 'investment' | 'retirement' | 'credit' | 'property';

export default function AccountsScreen() {
  const { colors } = useTheme();
  const [selectedType, setSelectedType] = useState<AccountType>('all');

  const filteredAccounts = selectedType === 'all'
    ? MOCK_ACCOUNTS
    : MOCK_ACCOUNTS.filter(a => a.type === selectedType);

  const accountTypes: { key: AccountType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'savings', label: 'Savings' },
    { key: 'investment', label: 'Investment' },
    { key: 'retirement', label: 'Retirement' },
    { key: 'property', label: 'Property' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={accountTypes}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }) => (
            <Pressable
              style={[
                styles.filterTab,
                {
                  backgroundColor: selectedType === item.key ? colors.primary : colors.card,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => setSelectedType(item.key)}
            >
              <Text
                style={[
                  styles.filterText,
                  {
                    color: selectedType === item.key ? '#ffffff' : colors.text,
                  },
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          )}
        />
      </View>

      {/* Accounts List */}
      <FlatList
        data={filteredAccounts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => <AccountCard account={item} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="wallet-outline" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No accounts found
            </Text>
          </View>
        }
      />

      {/* Add Account FAB */}
      <Pressable
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => {
          // TODO: Open add account modal
        }}
      >
        <Ionicons name="add" size={28} color="#ffffff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filterContainer: {
    paddingVertical: 12,
  },
  filterList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
