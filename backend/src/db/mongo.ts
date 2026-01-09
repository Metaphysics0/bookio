import { MongoClient, Db } from "mongodb";
import { config } from "@/config";

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectMongo(): Promise<Db> {
	if (db) return db;

	client = new MongoClient(config.mongo.uri);
	await client.connect();
	db = client.db(config.mongo.database);

	console.log(`Connected to MongoDB: ${config.mongo.database}`);
	return db;
}

export function getDb(): Db {
	if (!db) {
		throw new Error("MongoDB not connected. Call connectMongo() first.");
	}
	return db;
}

export async function disconnectMongo(): Promise<void> {
	if (client) {
		await client.close();
		client = null;
		db = null;
		console.log("Disconnected from MongoDB");
	}
}
