require("dotenv").config();
const { MongoClient } = require('mongodb');

const options = {
    useUnifiedTopology: true,
    useNewUrlParser: true,
};



let mongoClient = null;
let database = null;

async function main(req, res, next) {
    try {
        const uri = process.env.DB_URL;

        if (!process.env.DB_URL) {
            throw new Error('Please add your Mongo URI to .env.local')
        }

        const client = new MongoClient(uri, options);

        await client.connect();

    } catch (e) {
        console.error(e);
    } finally {
        next()
    }
}

// const connectToDatabase = async (req, res, next) => {
//     try {


//         // if (mongoClient && database) {
//         //     console.log('ya esta conectado');
//         //     return { mongoClient, database };
//         // }
//         // if (process.env.NODE_ENV === "development") {
//         //     if (!global._mongoClient) {
//         //         mongoClient = await (new MongoClient(uri, options)).connect();
//         //         global._mongoClient = mongoClient;
//         //     } else {
//         //         mongoClient = global._mongoClient;
//         //     }
//         // } else {
//         //     console.log('conecta?');
//         //     mongoClient = await (new MongoClient(uri, options)).connect();
//         // }
//         // database = await mongoClient.db(process.env.NEXT_ATLAS_DATABASE);
//         // return { mongoClient, database };
//     } catch (e) {
//         console.error(e);
//     } finally {
//         next()
//     }
// }

module.exports = main;