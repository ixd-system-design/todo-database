import express from "express";
import mongoose from "mongoose";
import serverless from "serverless-http";
import Todo from "../models/Todo.js";

export const api = express();
api.use(express.json());

let connection;

async function connectToDatabase() {
	if (connection) return connection;
	if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not configured");
	connection = mongoose.connect(process.env.MONGODB_URI).catch((error) => {
		connection = undefined;
		throw error;
	});
	return connection;
}

const router = express.Router();

router.get("/hello", (req, res) => res.send("Hello World!"));

router.post("/todo", async (req, res) => {
	try {
		await connectToDatabase();
		const todo = await Todo.create({ content: req.body.content });
		res.status(201).send(todo);
	} catch (error) {
		res.status(400).send({ error: error.message });
	}
});

router.get("/todos", async (req, res) => {
	try {
		await connectToDatabase();
		const todos = await Todo.find().sort({ date: -1 });
		res.send(todos);
	} catch (error) {
		res.status(500).send({ error: error.message });
	}
});

router.put("/todo/:id", async (req, res) => {
	try {
		if (!mongoose.isValidObjectId(req.params.id)) {
			return res.status(400).send({ error: "Invalid todo id" });
		}
		await connectToDatabase();
		const todo = await Todo.findByIdAndUpdate(
			req.params.id,
			{ content: req.body.content },
			{ returnDocument: "after", runValidators: true },
		);
		if (!todo) return res.status(404).send({ error: "Todo not found" });
		res.send(todo);
	} catch (error) {
		res.status(400).send({ error: error.message });
	}
});

router.delete("/todo/:id", async (req, res) => {
	try {
		if (!mongoose.isValidObjectId(req.params.id)) {
			return res.status(400).send({ error: "Invalid todo id" });
		}
		await connectToDatabase();
		const todo = await Todo.findByIdAndDelete(req.params.id);
		if (!todo) return res.status(404).send({ error: "Todo not found" });
		res.send(todo);
	} catch (error) {
		res.status(400).send({ error: error.message });
	}
});

api.use("/api", router);

export const handler = serverless(api);

if (!process.env.NETLIFY) {
	const port = 3000;
	api.use(express.static("frontend"));
	api.listen(port, () => console.log(`API running at http://localhost:${port}`));
}
