const { Schema, model, Types } = require('mongoose')

const schema = new Schema({
	email: { type: String, required: true, unique: true },
	password: { type: String, required: true },
	female: { type: String, required: true },
	userName: { type: String, required: true, unique: true },
	role: { type: String, default: 'user', required: true },
	online: { type: String, default: 'offline', required: true },
	status: { type: String, default: '' },
	userPhoto: { type: String, default: 'false' },
	chats: [],
	friends: [],
	photos: [],
	music: [],
	subscribers: [],
	subsUser: [],
	posts: [],
	socketId: { type: String, default: 'none', required: true }
})
module.exports = model('User', schema)