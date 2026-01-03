import { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

export default function WelcomeScreen() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const { colors } = useTheme();

  useEffect(() => {
    if (!isLoading && user) {
      router.replace('/(tabs)/dashboard');
    }
  }, [user, isLoading]);

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.loadingText, { color: colors.text }]}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>
          Net Worth Tracker
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Track your financial journey with ease
        </Text>

        <View style={styles.features}>
          <FeatureItem
            icon="📊"
            title="Track Accounts"
            description="Monitor all your financial accounts in one place"
            colors={colors}
          />
          <FeatureItem
            icon="📈"
            title="Visualize Growth"
            description="Beautiful charts to see your progress over time"
            colors={colors}
          />
          <FeatureItem
            icon="🌍"
            title="Multi-Currency"
            description="Support for multiple currencies with live exchange rates"
            colors={colors}
          />
        </View>

        <Pressable
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/auth/login')}
        >
          <Text style={styles.buttonText}>Get Started</Text>
        </Pressable>
      </View>
    </View>
  );
}

function FeatureItem({
  icon,
  title,
  description,
  colors,
}: {
  icon: string;
  title: string;
  description: string;
  colors: any;
}) {
  return (
    <View style={styles.featureItem}>
      <Text style={styles.featureIcon}>{icon}</Text>
      <View style={styles.featureContent}>
        <Text style={[styles.featureTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.featureDescription, { color: colors.textSecondary }]}>
          {description}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 48,
  },
  loadingText: {
    fontSize: 16,
    textAlign: 'center',
  },
  features: {
    marginBottom: 48,
    gap: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  featureIcon: {
    fontSize: 32,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
});
