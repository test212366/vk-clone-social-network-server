const { Schema, model } = require('mongoose')

const schema = new Schema({
	user: String,
	posts: []
})
module.exports = model('posts', schema)