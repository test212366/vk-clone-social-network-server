const User = require('../models/Users')
const Chat = require('../models/Chats')
const Post = require('../models/Posts')
const uuid = require('uuid')
const fs = require('fs')

const jwt = require('jsonwebtoken')
const { validationResult } = require('express-validator')
const bcrypt = require('bcrypt')

const generateJwt = (id, email, role) => {
	return jwt.sign({ id, email, role }, process.env.SECRET_KEY,
		{ expiresIn: '48h' })
}
class UserController {
	async registration(req, res, next) {
		const errors = validationResult(req)
		if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array(), message: 'trow something' })
		const { email, password, userName, userLastName, female, role } = req.body
		const isUsedEmail = await User.findOne({ email })
		if (isUsedEmail) return res.status(300).json({ message: 'throw email used' })
		const isNameUsed = await User.findOne({ userName })
		if (isNameUsed) return res.status(300).json({ message: 'throw name used' })
		const hashPassword = await bcrypt.hash(password, 8)
		const user = new User({
			email, password: hashPassword, female, userName, userLastName, role
		})
		const token = generateJwt(user.id, user.email, user.role)
		await user.save()
		res.status(201).json({ token })
	}
	async login(req, res, next) {
		const errors = validationResult(req)
		if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array(), message: 'trow something' })
		const { email, password } = req.body
		const user = await User.findOne({ email })
		if (!user) return res.status(404).json({ email: 'email не используется, пользователь не найден..' })
		const comparePassword = bcrypt.compareSync(password, user.password)
		if (!comparePassword) return res.status(400).json({ password: 'не действительный пароль..' })
		const token = generateJwt(user.id, user.email, user.role)
		return res.json({ token })
	}
	async onlineW(req, res, next) {
		const { email } = req.body
		const user = await User.findOneAndUpdate({ email }, { online: 'online' },)
		return res.status(201).json({ user })
	}
	async getUser(req, res, next) {
		const { id } = req.body
		const user = await User.findById(id)
		return res.json({ user })
	}
	async getMessages(req, res, next) {
		const { id } = req.body
		const user = await User.findById(id)
		let messagesUsers = []
		if (!user.chats.length) {
			return res.json({ message: 'undefined chats 404' })
		} else {
			user.chats.forEach(async chat => {
				const idChat = chat.id
				const chatF = await Chat.findById(idChat)
				let one = chatF.users.slice(0, 24)
				let two = chatF.users.slice(24)
				if (one !== id) {
					const user = await User.findById(one)
					let message = false
					let dataMess = false
					if (chatF.chat.length === 0) {
						message = 'пользователь начал чат..'
						dataMess = ''
					} else {
						if (chatF.chat[chatF.chat.length - 1].message) {
							message = chatF.chat[chatF.chat.length - 1].message
							dataMess = chatF.chat[chatF.chat.length - 1].date
						} else {
							message = 'пользователь отправил публикацию..'
							dataMess = ''
						}
					}
					const chatItem = {
						name: user.userName,
						online: user.online,
						userPhoto: user.userPhoto,
						lastMessage: message,
						lastMessageData: dataMess,
						currentIdChat: idChat
					}
					messagesUsers.push(chatItem)
				} else if (two !== id) {
					const user = await User.findById(two)
					let message = false
					let dataMess = false
					if (chatF.chat.length === 0) {
						message = 'пользователь начал чат..'
						dataMess = ''
					} else {
						if (chatF.chat[chatF.chat.length - 1].message) {
							message = chatF.chat[chatF.chat.length - 1].message
							dataMess = chatF.chat[chatF.chat.length - 1].date
						} else {
							message = 'пользователь отправил публикацию..'
							dataMess = ''
						}
					}

					const chatItem = {
						name: user.userName,
						online: user.online,
						lastMessage: message,
						userPhoto: user.userPhoto,
						lastMessageData: dataMess,
						currentIdChat: idChat
					}
					messagesUsers.push(chatItem)
				}
				console.log(chatF.chat[chatF.chat.length - 1])
			})
			setTimeout(() => {
				return res.status(200).json(messagesUsers)
			}, 800)
		}

	}
	async getChat(req, res, next) {
		const { chatId, myUserId } = req.body
		const candidate = await Chat.findById(chatId)
		if (!candidate) return res.status(404).json({ message: 'chat is not defined' })
		let one = candidate.users.slice(0, 24)
		let two = candidate.users.slice(24)
		if (one !== myUserId) {
			const user = await User.findById(one)
			return res.json({ user, userId: one, start: candidate.start, messages: candidate.chat })
		} else if (two !== myUserId) {
			const user = await User.findById(two)
			return res.json({ user, userId: two, start: candidate.start, messages: candidate.chat })
		}
	}
	async findFriends(req, res, next) {
		const { userName } = req.body
		const candidate = await User.findOne({ userName })
		if (!candidate) return res.json({ message: 'users is not find' })
		return res.json(candidate)
	}
	async addFriend(req, res, next) {
		const { userSub, currentUser } = req.body
		const userOne = await User.findById(userSub)
		await User.findByIdAndUpdate(currentUser, { $push: { subscribers: { userId: userSub, user: userOne } } })
		await User.findByIdAndUpdate(userSub, { $push: { subsUser: { userId: currentUser } } })
		return res.status(200).json({ message: 'ok Friend' })
	}
	async addCurrentFriend(req, res, next) {
		const { currentUserId, addFriendId } = req.body
		const friend = await User.findById(addFriendId)
		const user = await User.findById(currentUserId)
		await User.findByIdAndUpdate(currentUserId, { $pull: { subscribers: { userId: addFriendId } } })
		await User.findByIdAndUpdate(addFriendId, { $pull: { subscribers: { userId: currentUserId } } })
		await User.findByIdAndUpdate(currentUserId, { $push: { friends: { user: { ...friend } } }, $pull: { subsUser: { userId: addFriendId } } })
		await User.findByIdAndUpdate(addFriendId, { $push: { friends: { user } }, $pull: { subsUser: { userId: currentUserId } } })
		const userI = await User.findById(currentUserId)
		return res.json({ user: userI })
	}
	async updateFriends(req, res, next) {
		const { array } = req.body
		const newArray = []
		await array.map(async item => {
			const itemArr = await User.findById(item.user._id)
			newArray.push(itemArr)
		})
		setTimeout(() => {
			res.json({ array: newArray })
		}, 2500)
	}
	async createNewPost(req, res, next) {
		const { id, description, data, src } = req.body

		const user = await User.findById(id)
		const post = await Post.findOne({ user: user.userName })
		if (post) {
			await Post.findOneAndUpdate({ user: user.userName }, { $push: { posts: { description, userPhoto: user.userPhoto, src, userName: user.userName, data, likes: [], userId: `${user._id}`, comments: [], reposts: [] } } })
			return res.status(200).json({ post: { description, userPhoto: user.userPhoto, userName: user.userName, data, src, likes: [], userId: `${user._id}`, comments: [], reposts: [] } })
		} else {
			const post = new Post({
				user: user.userName, posts: []
			})
			await post.save()
			await Post.findOneAndUpdate({ user: user.userName }, { $push: { posts: { description, userPhoto: user.userPhoto, src, userName: user.userName, data, likes: [], userId: `${user._id}`, comments: [], reposts: [] } } })
			return res.status(200).json({ post: { description, userPhoto: user.userPhoto, userName: user.userName, data, src, likes: [], userId: `${user._id}`, comments: [], reposts: [] } })
		}

	}
	async giveFriendPost(req, res, next) {
		const { id } = req.body
		const user = await User.findById(id)
		const post = await Post.findOne({ user: user.userName })
		let arr = []
		const temp = async () => {
			post.posts.map(post => {
				post.userPhoto = user.userPhoto
				arr.push(post)
			})
		}
		await temp()
		return res.json({ arrayNews: arr })
	}
	async giveAllPosts(req, res, next) {
		console.log(req.body.id)
		const { id } = req.body
		const user = await User.findById(id)
		const posts = await Post.findOne({ user: user.userName })
		return res.json({ posts: posts.posts })
	}
	async handler(req, res, next) {
		const { name, desctiption, data, userLike } = req.body
		console.log(name)
		console.log(userLike)
		const user = await User.findOne({ userName: userLike })
		const post = await Post.findOne({ user: name })
		console.log(post)
		const temp = async () => {
			await post.posts.forEach(postI => {
				console.log(postI.desctiption === desctiption && postI.data === data)
				if (postI.desctiption === desctiption && postI.data === data) {
					postI.likes.push({ user: user.userName })
					console.log(postI)
				}
			})
		}
		await temp()
		console.log(post.posts)
		const currentPost = await Post.replaceOne({ user: post.user }, { user: post.user, posts: post.posts })
		return res.json(currentPost)
	}
	async handlerDelLike(req, res, next) {
		const { name, desctiption, data, userLike } = req.body
		console.log(name)
		console.log(userLike)
		const user = await User.findOne({ userName: userLike })
		const post = await Post.findOne({ user: name })
		const temp = async () => {
			await post.posts.forEach(postI => {
				console.log(postI.desctiption === desctiption && postI.data === data)
				if (postI.desctiption === desctiption && postI.data === data) {
					postI.likes.forEach((like, i) => {
						if (like.user === user.userName) postI.likes.splice(i, 1)
					})
				}
			})
		}
		await temp()
		console.log(post.posts)
		const currentPost = await Post.replaceOne({ user: post.user }, { user: post.user, posts: post.posts })
		return res.json(currentPost)
	}
	async getComments(req, res, next) {
		const { item } = req.body
		const post = await Post.findOne({ user: item.name })
		let itemS = false
		const temp = async () => {
			await post.posts.forEach(postI => {
				if (postI.desctiption === item.desctiption && postI.data === item.data) {
					itemS = postI
					console.log(postI)
				}
			})
		}
		await temp()
		if (itemS) {
			console.log(itemS)
			return res.json({ post: itemS })
		}

	}
	async createComment(req, res, next) {
		const { name, input, data, postName, postDesc, postData } = req.body
		const post = await Post.findOne({ user: postName })
		const user = await User.findOne({ userName: name })
		console.log(post, postDesc)
		const temp = async () => {
			await post.posts.forEach(postI => {
				console.log(postI.description)
				if (postI.description === postDesc && postI.data === postData && postI.userName === postName) {
					postI.comments.push({ user: name, value: input, data, userPhoto: user.userPhoto })
					console.log(postI)
				}
			})
		}
		await temp()
		await Post.replaceOne({ user: post.user }, { user: post.user, posts: post.posts })
		return res.json({ user: name, value: input, data })
	}
	async repost(req, res, next) {
		const { id, postName, postDesc, postData, userSend } = req.body
		console.log(id, postName, postDesc, postData)
		const post = await Post.findOne({ user: postName })
		let currentPostRepost = false
		const temp = async () => {
			console.log(post)
			await post.posts.forEach(postI => {
				console.log(postI.description === postDesc, postI.data === postData, postI.userName === postName)
				console.log(postI.description, postDesc)
				if (postI.description === postDesc && postI.data === postData && postI.userName === postName) {
					currentPostRepost = postI
					postI.reposts.push({ user: postName })
					console.log(currentPostRepost)
				}
			})
		}
		await temp()
		const currentPost = await Post.replaceOne({ user: post.user }, { user: post.user, posts: post.posts })
		if (currentPostRepost) {
			const chat = await Chat.findByIdAndUpdate(id, { $push: { chat: { repost: 'repost', userSend, currentPostRepost } } })
			return res.json(chat)
		}
	}
	async deleteUser(req, res, next) {
		const { userY, userH } = req.body
		console.log(userY, userH)
		const userYou = await User.findById(userY)
		const userHe = await User.findById(userH)
		console.log(userYou.userName, userHe.userName)
		const one = async () => {
			await userYou.friends.forEach((friend, i) => {
				if (`${friend.user._id}` === userH) {
					userYou.friends.splice(i, 1)
				}
			})
		}
		await one()
		const two = async () => {
			await userHe.friends.forEach((friend, i) => {
				if (`${friend.user._id}` === userY) {
					userHe.friends.splice(i, 1)
				}
			})
		}
		await two()
		await User.replaceOne({ userName: userYou.userName }, { email: userYou.email, userPhoto: userYou.userPhoto, password: userYou.password, female: userYou.female, userName: userYou.userName, role: userYou.role, online: userYou.online, status: userYou.status, chats: userYou.chats, friends: userYou.friends, subscribers: userYou.subscribers, subsUser: userYou.subsUser, posts: userYou.posts, socketId: userYou.socketId })
		await User.replaceOne({ userName: userHe.userName }, { email: userHe.email, userPhoto: userHe.userPhoto, password: userHe.password, female: userHe.female, userName: userHe.userName, role: userHe.role, online: userHe.online, status: userHe.status, chats: userHe.chats, friends: userHe.friends, subscribers: userHe.subscribers, subsUser: userHe.subsUser, posts: userHe.posts, socketId: userHe.socketId })
		return res.json({ message: 'ok' })
	}
	async setStatus(req, res, next) {
		const { id, value } = req.body
		await User.findByIdAndUpdate(id, { status: value })
		const currentUser = await User.findById(id)
		return res.json(currentUser.status)
	}
	async uploadAvatar(req, res, next) {
		try {
			const file = req.files.file
			const user = await User.findById(req.body.id)
			const avatarName = uuid.v4() + '.jpg'
			console.log(`${req.filePath}` + "\\" + avatarName)
			file.mv(`${req.filePath}` + "\\" + avatarName)
			user.userPhoto = avatarName
			await user.save()
			const updateUser = await User.findById(req.body.id)
			return res.json({ message: 'avatar was upload', user: updateUser })
		} catch (e) {
			console.log(e)
			return res.status(400).json('upload avatar error')
		}
	}
	async deleteAvatar(req, res, next) {
		try {
			const user = await User.findById(req.body.id)
			fs.unlinkSync(`${req.filePath}` + "\\" + user.userPhoto)
			user.userPhoto = 'false'
			await user.save()
			return res.json(user)
		} catch (e) {
			console.log(e)
			return res.status(400).json('delete avatar error')
		}
	}
	async uploadPhoto(req, res, next) {
		try {
			const file = req.files.file
			const avatarName = uuid.v4() + '.jpg'
			file.mv(`${req.filePath}` + "\\" + avatarName)
			return res.json({ message: 'avatar was upload', src: avatarName })
		} catch (e) {
			console.log(e)
			return res.status(400).json('upload avatar error')
		}
	}
	async uploadPhotoUs(req, res, next) {
		try {
			const file = req.files.file
			const avatarName = uuid.v4() + '.jpg'
			file.mv(`${req.filePath}` + "\\" + avatarName)
			await User.findByIdAndUpdate(req.body.id, { $push: { photos: { src: avatarName } } })
			const user = await User.findById(req.body.id)
			return res.json({ message: 'avatar was upload', user })
		} catch (e) {
			console.log(e)
			return res.status(400).json('upload avatar error')
		}
	}
	async uploadFile(req, res, next) {
		try {
			const file = req.files.file
			const avatarName = uuid.v4() + '.mp3'
			console.log(avatarName)
			file.mv(`${req.filePath}` + "\\" + avatarName)
			return res.json({ message: 'avatar was upload', src: avatarName })
		} catch (e) {
			console.log(e)
			return res.status(400).json('upload avatar error')
		}
	}
	async uploadTrack(req, res, next) {
		try {
			const { id, srcPhoto, srcFile, nameTrack } = req.body
			await User.findByIdAndUpdate(id, { $push: { music: { srcPhoto, srcFile, nameTrack } } })
			const user = await User.findById(id)
			return res.json({ message: 'avatar was upload', user })
		} catch (e) {
			console.log(e)
			return res.status(400).json('upload avatar error')
		}
	}
	async getAppUsers(req, res, next) {
		try {
			const users = await User.find({})
			let music = []
			let temp = false
			const two = async () => {
				await users.forEach((user) => {
					music = music.concat(user.music)
				})
				temp = true
			}
			await two()
			if (temp) {
				return res.json({ message: 'all users', music })
			}

		} catch (e) {
			console.log(e)
			return res.status(400).json('upload avatar error')
		}
	}
	async getNews(req, res, next) {
		try {
			const posts = await Post.find({})
			let news = []
			let temp = false
			const two = async () => {
				await posts.forEach((post) => {
					news = news.concat(post.posts)
				})
				temp = true
			}
			await two()
			if (temp) {
				return res.json({ message: 'all news', news })
			}

		} catch (e) {
			console.log(e)
			return res.status(400).json('upload avatar error')
		}
	}
}

module.exports = new UserController()