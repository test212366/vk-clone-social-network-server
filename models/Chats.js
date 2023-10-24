const {Schema, model} = require('mongoose')

const schema = new Schema({
 start: String,
 lastMess: String,
 users: {type: String, required: true, unique: true},
 chat: []
})
module.exports = model('chat', schema)