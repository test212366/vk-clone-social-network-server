const User = require('./models/Users')
const Chat = require('./models/Chats')
require('dotenv').config()
const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const app = express()
const socket = require('socket.io')
const router = require('./routers/index')
const fileUploader = require('express-fileupload')
const filePathMiddleware = require('./middlewares/filepath.middleware')
const path = require('path')

app.use(fileUploader())
app.use(cors())
app.use(filePathMiddleware(path.resolve(__dirname, 'static')))
app.use(express.json({ extended: true }))
app.use(express.static('static'))
app.use('/api', router)

const start = async () => {
	const PORT = process.env.PORT || 5000

	try {
		await mongoose.connect(process.env.URI_MONGOOSE)
		const server = app.listen(PORT, () => {
			console.log(`server was started in PORT:${PORT}`)
		})
		let currentEmail = ''
		app.post('/handlerDisconnect', (req, res) => {
			const { email } = req.body
			currentEmail = email
			return res.status(200)
		})
		const io = socket(server)
		io.on('connection', socket => {
			console.log('connect', socket.id)
			const handler = async () => {
				setTimeout(async () => {
					const user = await User.findOneAndUpdate({ email: currentEmail }, { socketId: socket.id })
						.then(currentEmail = '')
					console.log(user, socket.id)
				}, 1000)
			}
			handler()
			socket.on('disconnect', () => {
				console.log('disconnect', socket.id)
				const handler = async () => {
					const user = await User.findOneAndUpdate({ socketId: socket.id }, { online: new Date() })
					console.log(user)
				}
				handler()
			})
			socket.on('createChat', async data => {
				console.log(data)
				let one = data.users.slice(0, 24)
				let two = data.users.slice(24)
				const candidateTwo = await Chat.findOne({ users: `${one}${two}` })
				if (candidateTwo) return
				const candidateTree = await Chat.findOne({ users: `${two}${one}` })
				if (candidateTree) return
				const newChat = new Chat({
					start: data.start, users: data.users
				})
				await newChat.save()
				const temp = `${newChat._id}`

				await User.findByIdAndUpdate(one, { $push: { chats: { id: temp, handlerIdForUsers: data.users } } })
				await User.findByIdAndUpdate(two, { $push: { chats: { id: temp, handlerIdForUsers: data.users } } })
				one = ''
				two = ''
			})
			socket.on('sendMessage', async data => {
				console.log('send', data)
				const message = { message: data.message, date: data.date, userSend: data.userSend, src: data.src }
				await Chat.findByIdAndUpdate(data.chatId, { $push: { chat: message } })
				io.emit('responceServerMessage', data)
			})
		})


		console.log('pentagonWasHack1ng:)')
	} catch (e) {
		console.log(e.message)
	}
}
start()