const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Ruta para obtener datos climáticos filtrados
app.get('/clima', async (req, res) => {
    try {
        // Parámetros de filtración
        const { humidity, temperature, pressure } = req.query;

        // Llamada a la API de Open-Meteo para datos de Guanajuato
        const response = await axios.get('https://api.open-meteo.com/v1/forecast', {
            params: {
                latitude: 21.019, // Latitud de Guanajuato
                longitude: -101.257, // Longitud de Guanajuato
                hourly: 'temperature_2m,relative_humidity_2m,pressure_msl',
                start: new Date().toISOString().split('T')[0], // Fecha actual
                timezone: 'America/Mexico_City'
            }
        });

        // Filtración de datos basada en parámetros
        const filteredData = response.data.hourly.time.map((time, index) => {
            const data = {
                time,
                temperature: response.data.hourly.temperature_2m[index],
                humidity: response.data.hourly.relative_humidity_2m[index],
                pressure: response.data.hourly.pressure_msl[index]
            };

            // Aplicar filtros
            if (
                (humidity && data.humidity != humidity) ||
                (temperature && data.temperature != temperature) ||
                (pressure && data.pressure != pressure)
            ) {
                return null;
            }
            return data;
        }).filter(Boolean);

        res.json({ filteredData });
    } catch (error) {
        console.error('Error al obtener datos climáticos:', error);
        res.status(500).send('Error al obtener datos climáticos');
    }
});

app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en el puerto ${PORT}`);
});
