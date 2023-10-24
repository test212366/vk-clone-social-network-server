const Router = require('express')
const router = new Router()
const userController = require('../controllers/userController')
const { check } = require('express-validator')

// api/user/registration
router.post('/registration',
	[
		check('password', 'trow password').isLength({ min: 6, max: 25 }),
		check('email', 'trow email').isEmail(),
		check('userName', 'trow userName').isLength({ min: 2, max: 20 }),
	]
	, userController.registration)

router.post('/login', [check('email', 'trow email').isEmail(),
check('password', 'trow password').isLength({ min: 6, max: 25 }),
], userController.login)
router.post('/online', userController.onlineW)
router.post('/getUser', userController.getUser)
router.post('/getMessages', userController.getMessages)
router.post('/getChat', userController.getChat)
router.post('/findUser', userController.findFriends)
router.post('/addFriend', userController.addFriend)
router.post('/addCurrentFriend', userController.addCurrentFriend)
router.post('/updateFriends', userController.updateFriends)
router.post('/createNewPost', userController.createNewPost)
router.post('/giveFriendPost', userController.giveFriendPost)
router.post('/handler', userController.handler)
router.post('/handlerDelLike', userController.handlerDelLike)
router.post('/giveAllPosts', userController.giveAllPosts)
router.post('/getComments', userController.getComments)
router.post('/createComment', userController.createComment)
router.post('/repost', userController.repost)
router.post('/deleteUser', userController.deleteUser)
router.post('/setStatus', userController.setStatus)
router.post('/uploadAvatar', userController.uploadAvatar)
router.post('/uploadPhoto', userController.uploadPhoto)
router.post('/deleteAvatar', userController.deleteAvatar)
router.post('/uploadPhotoUs', userController.uploadPhotoUs)
router.post('/uploadFile', userController.uploadFile)
router.post('/getAppUsers', userController.getAppUsers)
router.post('/getNews', userController.getNews)
router.post('/uploadTrack', userController.uploadTrack)
module.exports = router