import http from 'http';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

async function getWeatherData(municipality) {
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('weather');
    const collection = db.collection('guanajuato');
    const data = await collection.findOne({ municipality });
    await client.close();
    return data;
}

const server = http.createServer(async (req, res) => {
    if (req.url.startsWith('/weather') && req.method === 'GET') {
        const urlParams = new URLSearchParams(req.url.split('?')[1]);
        const municipality = urlParams.get('municipality');
        if (!municipality) {
            res.statusCode = 400;
            res.end('Municipality is required');
            return;
        }
        const data = await getWeatherData(municipality);
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(data || { error: 'No data found' }));
    } else {
        res.statusCode = 404;
        res.end('Not Found');
    }
});

server.listen(process.env.PORT, () => {
    console.log(`Server running on port ${process.env.PORT}`);
});
