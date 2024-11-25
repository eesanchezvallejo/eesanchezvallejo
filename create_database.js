import { MongoClient } from 'mongodb';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const base_url_coord = 'https://geocoding-api.open-meteo.com/v1/search';
const base_url_weather = 'https://archive-api.open-meteo.com/v1/archive';

async function connectToMongoDB(uri) {
    const client = new MongoClient(uri);
    try {
        console.log('Conectando a MongoDB...');
        await client.connect();
        console.log('Conexión exitosa.');
        return client;
    } catch (error) {
        console.error('Error conectando a MongoDB:', error);
        throw error;
    }
}

async function fetchCoordinates(municipality) {
    const url = `${base_url_coord}?name=${municipality}&count=1&format=json&language=es`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
    const data = await response.json();
    return data.results?.[0];
}

async function fetchWeather(lat, lon, startDate, endDate) {
    const url = `${base_url_weather}?latitude=${lat}&longitude=${lon}&start_date=${startDate}&end_date=${endDate}&hourly=temperature_2m,relative_humidity_2m,surface_pressure`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
    return await response.json();
}

async function storeData(client, collectionName, data) {
    const db = client.db('weather');
    const collection = db.collection(collectionName);
    await collection.updateOne(
        { municipality: data.municipality },
        { $set: data },
        { upsert: true }
    );
    console.log(`Datos almacenados para: ${data.municipality}`);
}

async function processMunicipalities() {
    const client = await connectToMongoDB(process.env.MONGODB_URI);
    const municipalities = ['Guanajuato', 'Leon'];
    const startDate = '2019-01-01';
    const endDate = '2024-12-31';

    try {
        for (const municipality of municipalities) {
            const coordinates = await fetchCoordinates(municipality);
            if (coordinates) {
                const weather = await fetchWeather(
                    coordinates.latitude,
                    coordinates.longitude,
                    startDate,
                    endDate
                );
                const data = {
                    municipality: coordinates.name,
                    latitude: coordinates.latitude,
                    longitude: coordinates.longitude,
                    weather,
                };
                await storeData(client, 'guanajuato', data);
            }
        }
    } finally {
        await client.close();
    }
}

processMunicipalities().then(() => console.log('Proceso completado.'));

