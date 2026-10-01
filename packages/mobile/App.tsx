import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { Text } from 'react-native';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { SyncProvider } from './src/context/SyncContext';
import { LoginScreen } from './src/screens/LoginScreen';
import { ItemListScreen } from './src/screens/ItemListScreen';
import { ItemDetailScreen } from './src/screens/ItemDetailScreen';
import { AddItemScreen } from './src/screens/AddItemScreen';
import { ScanScreen } from './src/screens/ScanScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { PlacesScreen } from './src/screens/PlacesScreen';
import { LocationScreen } from './src/screens/LocationScreen';
import { ContainerScreen } from './src/screens/ContainerScreen';
import { LocationPickerScreen } from './src/screens/LocationPickerScreen';
import { LabelScreen } from './src/screens/LabelScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Navigation shape (v2):
//   Root stack
//   ├─ Main (bottom tabs: Items · Places · Scan · Settings)
//   └─ detail screens — ItemDetail, Container, Location, LocationPicker, AddItem
//
// Detail screens live in the ROOT stack (not inside a tab) so any tab can
// open any of them: Scan → Container, Places → Container → Item, etc.
// `navigation.navigate('Container', …)` from inside a tab bubbles up to
// the root stack automatically.

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarStyle: { paddingBottom: 4, height: 56 },
        headerShown: true,
      }}
    >
      <Tab.Screen
        name="ItemsTab"
        component={ItemListScreen}
        options={{
          title: 'Items',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>{'📦'}</Text>,
        }}
      />
      <Tab.Screen
        name="Places"
        component={PlacesScreen}
        options={{
          title: 'Places',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>{'📍'}</Text>,
        }}
      />
      <Tab.Screen
        name="Scan"
        component={ScanScreen}
        options={{
          title: 'Scan',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>{'📷'}</Text>,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>{'⚙️'}</Text>,
        }}
      />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return null; // Splash screen would go here
  }

  return (
    <Stack.Navigator>
      {user ? (
        <>
          <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
          <Stack.Screen name="ItemDetail" component={ItemDetailScreen} options={{ title: 'Item' }} />
          <Stack.Screen name="AddItem" component={AddItemScreen} options={{ title: 'Add Item' }} />
          <Stack.Screen name="Container" component={ContainerScreen} options={{ title: 'Container' }} />
          <Stack.Screen name="Location" component={LocationScreen} options={{ title: 'Location' }} />
          <Stack.Screen
            name="LocationPicker"
            component={LocationPickerScreen}
            options={{ title: 'Move', presentation: 'modal' }}
          />
          <Stack.Screen name="Label" component={LabelScreen} options={{ title: 'Print label', presentation: 'modal' }} />
        </>
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <AuthProvider>
        <SyncProvider>
          <RootNavigator />
          <StatusBar style="auto" />
        </SyncProvider>
      </AuthProvider>
    </NavigationContainer>
  );
}
