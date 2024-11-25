import http from 'http';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

async function getWeatherData(municipality, filters) {
    try {
        const mongoClient = new MongoClient(process.env.MONGODB_URI);
        await mongoClient.connect();
        const db = mongoClient.db('weather');
        const collection = db.collection('guanajuato');
        let query = { municipality };
        if (filters) {
            query = { municipality, ...filters };
        }
        const data = await collection.findOne(query);
        await mongoClient.close();
        return data;
    } catch (error) {
        console.error('Error obteniendo datos del clima:', error);
        throw error;
    }
}

const server = http.createServer(async (req, res) => {
    try {
        // Manejo para la raíz "/"
        if (req.url === '/' && req.method === 'GET') {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'text/plain');
            res.end('Welcome to the Weather App!');
            return;
        }

        // Manejo del endpoint "/weather"
        if (req.url.startsWith('/weather') && req.method === 'GET') {
            const urlParams = new URLSearchParams(req.url.split('?')[1]);
            const municipality = urlParams.get('municipality');
            const filters = {};
            if (urlParams.get('humidity')) {
                filters['weather.hourly.relative_humidity_2m'] = parseFloat(urlParams.get('humidity'));
            }
            if (urlParams.get('temperature')) {
                filters['weather.hourly.temperature_2m'] = parseFloat(urlParams.get('temperature'));
            }
            if (urlParams.get('pressure')) {
                filters['weather.hourly.surface_pressure'] = parseFloat(urlParams.get('pressure'));
            }
            if (!municipality) {
                res.statusCode = 400;
                res.end('Municipality is required');
                return;
            }
            const data = await getWeatherData(municipality, filters);
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(data));
            return;
        }

        // Si la ruta no coincide
        res.statusCode = 404;
        res.end('404 Not Found');
    } catch (error) {
        console.error('Error interno del servidor:', error);
        res.statusCode = 500;
        res.end('Internal Server Error');
    }
});

// Ajuste del servidor para escuchar en cualquier interfaz y puerto configurado
const hostname = '0.0.0.0';
server.listen(process.env.PORT || 3000, hostname, () => {
    console.log(`Server running at http://${hostname}:${process.env.PORT || 3000}/`);
});
