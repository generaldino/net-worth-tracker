import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../contexts/AuthContext';
import { ThemeProvider } from '../contexts/ThemeContext';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <Stack
            screenOptions={{
              headerStyle: {
                backgroundColor: colorScheme === 'dark' ? '#0f172a' : '#ffffff',
              },
              headerTintColor: colorScheme === 'dark' ? '#ffffff' : '#0f172a',
              headerTitleStyle: {
                fontWeight: 'bold',
              },
            }}
          >
            <Stack.Screen
              name="index"
              options={{
                title: 'Net Worth Tracker',
              }}
            />
            <Stack.Screen
              name="(tabs)"
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="auth/login"
              options={{
                title: 'Sign In',
                presentation: 'modal',
              }}
            />
          </Stack>
          <StatusBar style="auto" />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
