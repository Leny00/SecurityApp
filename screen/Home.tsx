import React, { useEffect, useState } from 'react';
import { Text, View, Image, StyleSheet, ScrollView, Alert, TouchableOpacity, TextInput, Button, Platform } from 'react-native';
import * as SQLite from 'expo-sqlite/legacy';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTrashAlt, faEdit, faCalendarAlt, faPlay, faPause } from '@fortawesome/free-solid-svg-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Audio } from 'expo-av';
import { handleImagePick } from '../components/pickerImage'; // Asegúrate de que esta función esté implementada correctamente

const library = [faTrashAlt, faEdit, faCalendarAlt];

interface Agentes {
    id: number;
    date: string;
    title: string;
    description: string;
    photo: string;
    audio: string;
}

export default function Home() {
    const db = SQLite.openDatabase('911.db');
    const [emergencia, setEmergencia] = useState<Agentes[]>([]);
    const [idToUpdate, setIdToUpdate] = useState<number | null>(null);
    const [fecha, setFecha] = useState('');
    const [titulo, setTitulo] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [foto, setFoto] = useState<string | null>(null); // Ajustado a string | null
    const [audio, setAudio] = useState<string | null>(null); // Ajustado a string | null
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [date, setDate] = useState(new Date());
    const [playingAudioId, setPlayingAudioId] = useState<number | null>(null);
    const [soundObject, setSoundObject] = useState<Audio.Sound | null>(null);
    const [isPlaying, setIsPlaying] = useState<boolean>(false);

    useEffect(() => {
        db.transaction((tx) => {
            tx.executeSql(
                `CREATE TABLE IF NOT EXISTS Agentes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    date TEXT,
                    title TEXT,
                    description TEXT,
                    photo TEXT,
                    audio TEXT
                );`,
                [],
                () => { console.log('Tabla creada correctamente'); },
                (_, error) => { console.error('Error al crear la tabla:', error); return true; }
            );
        });

        loadData();

        return () => {
            if (soundObject) {
                soundObject.unloadAsync();
            }
        };
    }, []);

    const loadData = () => {
        db.transaction((tx) => {
            tx.executeSql(
                'SELECT * FROM Agentes',
                [],
                (_, { rows }) => {
                    const resultados = rows._array as Agentes[];
                    setEmergencia(resultados);
                },
                (_, error) => {
                    console.error('Error en la consulta SQL:', error);
                    return true;
                }
            );
        });
    };

    const setData = async () => {
        if (!fecha || !titulo || !descripcion || !foto || !audio) {
            Alert.alert('Warning!', 'Por favor introduce todos los datos');
        } else {
            try {
                await db.transaction((tx) => {
                    tx.executeSql(
                        'INSERT INTO Agentes (date, title, description, photo, audio) VALUES (?, ?, ?, ?, ?);',
                        [fecha, titulo, descripcion, foto, audio],
                        (_, { insertId }) => {
                            console.log('Registro insertado con ID:', insertId);
                            loadData();
                            resetForm();
                        }
                    );
                });
            } catch (error) {
                console.error('Error al insertar en la base de datos:', error);
            }
        }
    };

    const updateData = async () => {
        if (!idToUpdate || !fecha || !titulo || !descripcion || !foto || !audio) {
            Alert.alert('Warning!', 'Por favor selecciona un registro y completa todos los campos');
            return;
        }

        try {
            await db.transaction((tx) => {
                tx.executeSql(
                    'UPDATE Agentes SET date=?, title=?, description=?, photo=?, audio=? WHERE id=?;',
                    [fecha, titulo, descripcion, foto, audio, idToUpdate],
                    (_, { rowsAffected }) => {
                        if (rowsAffected > 0) {
                            console.log(`Registro actualizado con ID ${idToUpdate}`);
                            setIdToUpdate(null);
                            resetForm();
                            loadData();
                        }
                    }
                );
            });
        } catch (error) {
            console.error('Error al actualizar en la base de datos:', error);
        }
    };

    const removeData = (id: number) => {
        try {
            db.transaction((tx) => {
                tx.executeSql(
                    'DELETE FROM Agentes WHERE id=?;',
                    [id],
                    (_, { rowsAffected }) => {
                        if (rowsAffected > 0) {
                            console.log(`Registro eliminado con ID ${id}`);
                            if (soundObject) {
                                soundObject.unloadAsync();
                            }
                            loadData();
                        }
                    }
                );
            });
        } catch (error) {
            console.error('Error al eliminar en la base de datos:', error);
        }
    };

    const deleteAllData = () => {
        try {
            db.transaction((tx) => {
                tx.executeSql(
                    'DELETE FROM Agentes;',
                    [],
                    (_, { rowsAffected }) => {
                        if (rowsAffected > 0) {
                            console.log('Todos los registros han sido eliminados');
                            if (soundObject) {
                                soundObject.unloadAsync();
                            }
                            loadData();
                        }
                    }
                );
            });
        } catch (error) {
            console.error('Error al eliminar todos los registros:', error);
        }
    };

    const handleEdit = (item: Agentes) => {
        setIdToUpdate(item.id);
        setFecha(item.date);
        setTitulo(item.title);
        setDescripcion(item.description);
        setFoto(item.photo);
        setAudio(item.audio);
    };

    const handleDocumentPick = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({ type: 'audio/*' });
            if (!result.canceled) {
                const base64Audio = await FileSystem.readAsStringAsync(result.assets[0].uri, {
                    encoding: FileSystem.EncodingType.Base64,
                });
                setAudio(base64Audio);
            }
        } catch (error) {
            console.error('Error al seleccionar el documento:', error);
        }
    };

    const handlePlayAudio = async (id: number | null, base64Audio: string) => {
        if (soundObject) {
            await soundObject.unloadAsync();
        }

        const audioData = `data:audio/mp3;base64,${base64Audio}`;
        const newSoundObject = new Audio.Sound();

        try {
            await newSoundObject.loadAsync({ uri: audioData });
            setSoundObject(newSoundObject);
            await newSoundObject.playAsync();
            setIsPlaying(true);
            setPlayingAudioId(id); // Actualiza el ID del audio en reproducción
        } catch (error) {
            console.error('Error al reproducir el audio:', error);
        }
    };

    const handlePauseAudio = async () => {
        if (soundObject && isPlaying) {
            await soundObject.pauseAsync();
            setIsPlaying(false);
        }
    };

    const resetForm = () => {
        setFecha('');
        setTitulo('');
        setDescripcion('');
        setFoto(null); // Ajustado a null
        setAudio(null); // Ajustado a null
        if (soundObject) {
            soundObject.unloadAsync();
        }
        setIsPlaying(false);
        setPlayingAudioId(null);
    };

    const openDatePicker = () => {
        setShowDatePicker(true);
    };

    const handleDateChange = (event: any, selectedDate?: Date) => {
        const currentDate = selectedDate || date;
        setShowDatePicker(Platform.OS === 'ios');
        setDate(currentDate);
        setFecha(currentDate.toISOString().split('T')[0]);
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView>
                <View style={styles.formContainer}>
                    <Text style={styles.formTitle}>{idToUpdate ? 'Editar Emergencia' : 'Agregar Emergencia'}</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Fecha (YYYY-MM-DD)"
                        placeholderTextColor={'#B0B0B0'}
                        value={fecha}
                        onChangeText={(text) => setFecha(text)}
                        onFocus={openDatePicker} // Cambiado a openDatePicker
                    />
                    {showDatePicker && (
                        <DateTimePicker
                            value={date}
                            mode="date"
                            onChange={handleDateChange}
                        />
                    )}
                    <TextInput
                        style={styles.input}
                        placeholder="Título"
                        placeholderTextColor={'#B0B0B0'}
                        value={titulo}
                        onChangeText={(text) => setTitulo(text)}
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="Descripción"
                        placeholderTextColor={'#B0B0B0'}
                        value={descripcion}
                        onChangeText={(text) => setDescripcion(text)}
                    />
                    <TouchableOpacity
                        style={styles.imagePickerButton}
                        onPress={() => handleImagePick(setFoto)} // Añadido para seleccionar imagen
                    >
                        <Text style={styles.imagePickerButtonText}>Seleccionar Imagen</Text>
                    </TouchableOpacity>
                    {foto && <Image source={{ uri: `data:image/png;base64,${foto}` }} style={styles.image} />}
                    <TouchableOpacity
                        style={styles.imagePickerButton}
                        onPress={handleDocumentPick} // Añadido para seleccionar audio
                    >
                        <Text style={styles.imagePickerButtonText}>Seleccionar Audio</Text>
                    </TouchableOpacity>
                    {audio && (
                        <View style={styles.audioControls}>
                            {playingAudioId === idToUpdate ? (
                                <Button title={isPlaying ? 'Pausar Audio' : 'Reproducir Audio'} onPress={isPlaying ? handlePauseAudio : () => handlePlayAudio(idToUpdate, audio)} />
                            ) : (
                                <Button title="Reproducir Audio" onPress={() => handlePlayAudio(idToUpdate, audio)} />
                            )}
                        </View>
                    )}
                    <TouchableOpacity
                        style={styles.button}
                        onPress={idToUpdate ? updateData : setData}
                    >
                        <Text style={styles.buttonText}>{idToUpdate ? 'Actualizar' : 'Guardar'}</Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.listContainer}>
                    {emergencia.map((item) => (
                        <View key={item.id} style={styles.card}>
                            <Text style={styles.cardTitle}>{item.title}</Text>
                            <Text style={styles.cardDate}>{item.date}</Text>
                            <Text style={styles.cardDescription}>{item.description}</Text>
                            {item.photo && (
              <Image
                source={{ uri: `data:image/png;base64,${item.photo}` }}
                style={styles.image}
              />
            )}
                            {item.audio && (
                                <View style={styles.audioControls}>
                                    {playingAudioId === item.id ? (
                                        isPlaying ? (
                                            <TouchableOpacity onPress={handlePauseAudio}>
                                                <FontAwesomeIcon icon={faPause} size={24} color="#E94E77" />
                                            </TouchableOpacity>
                                        ) : (
                                            <TouchableOpacity onPress={() => handlePlayAudio(item.id, item.audio)}>
                                                <FontAwesomeIcon icon={faPlay} size={24} color="#00BFFF" />
                                            </TouchableOpacity>
                                        )
                                    ) : (
                                        <TouchableOpacity onPress={() => handlePlayAudio(item.id, item.audio)}>
                                            <FontAwesomeIcon icon={faPlay} size={24} color="#00BFFF" />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            )}
                            <View style={styles.cardActions}>
                                <TouchableOpacity
                                    style={styles.iconButton}
                                    onPress={() => handleEdit(item)}
                                >
                                    <FontAwesomeIcon icon={faEdit} size={20} color="#F4C542" />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.iconButton}
                                    onPress={() => removeData(item.id)}
                                >
                                    <FontAwesomeIcon icon={faTrashAlt} size={20} color="#E94E77" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#121212',
    },
    formContainer: {
        backgroundColor:'#121212',
        padding: 20,
    },
    formTitle: {
        color:'#E0E0E0',
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 4,
        padding: 10,
        marginBottom: 10,
        
    },
    button: {
        backgroundColor:'#002080',
        padding: 15,
        borderRadius: 4,
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
    },
    imagePickerButton: {
        backgroundColor: '#0033A0',
        padding: 15,
        borderRadius: 4,
        alignItems: 'center',
        marginVertical: 10,
    },
    imagePickerButtonText: {
        color: '#fff',
        fontSize: 16,
    },
    image: {
     width: '100 %',
    height: 400,
    marginBottom: 15,
     borderRadius: 5,
    },
    audioControls: {
        marginVertical: 10,
    },
    listContainer: {
        padding: 20,
    },
    card: {
        borderWidth: 1,
        borderColor: '#003366',
        borderRadius: 4,
        padding: 15,
        marginBottom: 15,
        backgroundColor:'#1E1E1E',
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color:'#E0E0E0',
    },
    cardDate: {
        color: '#B0B0B0',
        marginVertical: 5,
    },
    cardDescription: {
        marginVertical: 5,
        color:'#B0B0B0'
    },
    cardImage: {
        width: '100%',
        height: 100,
        resizeMode: 'cover',
        marginVertical: 10,
    },
    cardActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    iconButton: {
        padding: 10,
    },
});
