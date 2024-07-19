import React, { useEffect, useState, Suspense } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import Home from './screen/Home';
import AboutScreen from './screen/Acercade'; // Asegúrate de que el nombre del archivo sea correcto
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faHome,faAddressCard} from '@fortawesome/free-solid-svg-icons';
import { SQLiteProvider } from 'expo-sqlite/next';

// Configuración de la navegación
const Tab = createBottomTabNavigator();

export default function App() {
  const [dbLoaded, setDbLoaded] = useState(false);

  const loadDatabase = async () => {
    const dbName = '911.db';
    const dbAsset = require('./assets/911.db');
    const dbUri = Asset.fromModule(dbAsset).uri;
    const dbFilePath = `${FileSystem.documentDirectory}SQLite/${dbName}`;

    const fileInfo = await FileSystem.getInfoAsync(dbFilePath);
    if (!fileInfo.exists) {
      await FileSystem.makeDirectoryAsync(
        `${FileSystem.documentDirectory}SQLite`,
        { intermediates: true }
      );
      await FileSystem.downloadAsync(dbUri, dbFilePath);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        await loadDatabase();
        setDbLoaded(true);
      } catch (error) {
        console.error('Error loading database:', error);
      }
    };

    loadData();
  }, []);

  if (!dbLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text>Cargando base de datos...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      
      <Suspense fallback={<ActivityIndicator size="large" color="#E94E77" />}>
        <SQLiteProvider
          databaseName="911.db"
          useSuspense
        >
          <Tab.Navigator
          screenOptions={{
            tabBarStyle:{
              backgroundColor:'#121212',
              borderColor:'#121212',
              paddingBottom:5,
            }
          }}
          >
            <Tab.Screen
              name="Home"
              
              component={Home}
              options={{
                headerShown: false,
                tabBarLabel: 'Inicio',
                tabBarIcon: () => <FontAwesomeIcon icon={faHome} size={24} color="#E94E77" />,
              }}
            />
            <Tab.Screen
              name="About"
              component={AboutScreen}
              options={{
                headerShown: false,
                tabBarLabel: 'Acerca de',
                tabBarIcon: () => <FontAwesomeIcon icon={faAddressCard} size={24} color="#0033A0" />,
              }}
            />
          </Tab.Navigator>
        </SQLiteProvider>
      </Suspense>
    </NavigationContainer>
  );
}
const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
  },
});
