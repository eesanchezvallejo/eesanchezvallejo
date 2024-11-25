import { MongoClient } from 'mongodb';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const base_url_coord = 'https://geocoding-api.open-meteo.com/v1/search';
const base_url_weather = 'https://archive-api.open-meteo.com/v1/archive';

async function connectToMongoDB(uri) {
    const mongoClient = new MongoClient(uri);
    try {
        console.log('Conectando a MongoDB...');
        await mongoClient.connect();
        console.log('Conectado a MongoDB');
        return mongoClient;
    } catch (error) {
        console.error('Error al conectar a MongoDB:', error);
        throw error;
    }
}

async function fetchCoordinates(municipality) {
    const url = `${base_url_coord}?name=${municipality}&count=1&format=json&language=es`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        const data = await response.json();
        return data.results?.[0];
    } catch (error) {
        console.error(`Error obteniendo coordenadas para ${municipality}:`, error);
    }
}

async function fetchWeather(lat, lon, startDate, endDate) {
    const url = `${base_url_weather}?latitude=${lat}&longitude=${lon}&start_date=${startDate}&end_date=${endDate}&hourly=temperature_2m,relative_humidity_2m,surface_pressure`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error obteniendo datos climáticos: ${error}`);
    }
}

async function storeDataInMongoDB(mongoClient, collectionName, data) {
    try {
        const db = mongoClient.db('weather');
        const collection = db.collection(collectionName);
        await collection.updateOne(
            { municipality: data.municipality },
            { $set: data },
            { upsert: true }
        );
        console.log(`Datos actualizados para: ${data.municipality}`);
    } catch (error) {
        console.error('Error al almacenar datos en MongoDB:', error);
    }
}

async function processMunicipalities() {
    const mongoClient = await connectToMongoDB(process.env.MONGODB_URI);
    const municipalities = ['Guanajuato', 'León'];
    const startDate = '2019-01-01';
    const endDate = '2024-11-30';

    try {
        for (const municipality of municipalities) {
            const coordinates = await fetchCoordinates(municipality);
            if (coordinates) {
                const weatherData = await fetchWeather(
                    coordinates.latitude,
                    coordinates.longitude,
                    startDate,
                    endDate
                );
                if (weatherData) {
                    const dataToStore = {
                        municipality: coordinates.name,
                        latitude: coordinates.latitude,
                        longitude: coordinates.longitude,
                        weather: weatherData,
                    };
                    await storeDataInMongoDB(mongoClient, 'guanajuato', dataToStore);
                }
            }
        }
    } finally {
        await mongoClient.close();
    }
}

processMunicipalities().then(() => console.log('Proceso completado.'));
