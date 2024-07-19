import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

// Función para seleccionar una imagen
     export const handleImagePick = async (setImage: (image: string) => void) => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permiso necesario', 'Por favor, permite el acceso a la galería para seleccionar una imagen.');
          return;
        }
    
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          base64: true,
          quality: 1,
        });
    
        if (!result.canceled && result.assets.length > 0) {
            setImage(result.assets[0].base64 || '');
        }
      };
