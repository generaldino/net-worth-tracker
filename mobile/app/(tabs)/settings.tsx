import { View, Text, StyleSheet, ScrollView, Pressable, Switch } from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';

export default function SettingsScreen() {
  const { colors, isDark, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [maskValues, setMaskValues] = useState(false);

  const settingsSections = [
    {
      title: 'Display',
      items: [
        {
          icon: 'moon-outline',
          label: 'Dark Mode',
          type: 'toggle',
          value: isDark,
          onToggle: toggleTheme,
        },
        {
          icon: 'eye-off-outline',
          label: 'Mask Values',
          type: 'toggle',
          value: maskValues,
          onToggle: () => setMaskValues(!maskValues),
        },
      ],
    },
    {
      title: 'Currency',
      items: [
        {
          icon: 'cash-outline',
          label: 'Display Currency',
          type: 'link',
          value: 'USD',
          onPress: () => {},
        },
      ],
    },
    {
      title: 'Data',
      items: [
        {
          icon: 'download-outline',
          label: 'Export Data',
          type: 'link',
          onPress: () => {},
        },
        {
          icon: 'cloud-upload-outline',
          label: 'Sync Status',
          type: 'link',
          value: 'Synced',
          onPress: () => {},
        },
      ],
    },
    {
      title: 'Account',
      items: [
        {
          icon: 'person-outline',
          label: 'Profile',
          type: 'link',
          value: user?.email || 'Not signed in',
          onPress: () => {},
        },
        {
          icon: 'log-out-outline',
          label: 'Sign Out',
          type: 'link',
          destructive: true,
          onPress: async () => {
            await signOut();
            router.replace('/');
          },
        },
      ],
    },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      {settingsSections.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            {section.title}
          </Text>
          <View style={[styles.sectionContent, { backgroundColor: colors.card }]}>
            {section.items.map((item, index) => (
              <Pressable
                key={item.label}
                style={[
                  styles.settingItem,
                  index < section.items.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                  },
                ]}
                onPress={item.type === 'link' ? item.onPress : undefined}
              >
                <View style={styles.settingLeft}>
                  <Ionicons
                    name={item.icon as any}
                    size={22}
                    color={item.destructive ? colors.destructive : colors.text}
                  />
                  <Text
                    style={[
                      styles.settingLabel,
                      { color: item.destructive ? colors.destructive : colors.text },
                    ]}
                  >
                    {item.label}
                  </Text>
                </View>
                <View style={styles.settingRight}>
                  {item.type === 'toggle' ? (
                    <Switch
                      value={item.value}
                      onValueChange={item.onToggle}
                      trackColor={{ false: colors.border, true: colors.primary }}
                    />
                  ) : (
                    <>
                      {item.value && (
                        <Text style={[styles.settingValue, { color: colors.textSecondary }]}>
                          {item.value}
                        </Text>
                      )}
                      <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                    </>
                  )}
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      ))}

      <Text style={[styles.version, { color: colors.textSecondary }]}>
        Version 1.0.0
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 24,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginLeft: 4,
  },
  sectionContent: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingLabel: {
    fontSize: 16,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingValue: {
    fontSize: 16,
  },
  version: {
    textAlign: 'center',
    fontSize: 14,
    marginTop: 8,
  },
});
