import express from 'express';
const router = express.Router();
const userController = require('../controllers/AuthController');
const auth = require('../middlewares/auth');

router.get('/allusers', userController.getAllUser);
router.get('/:id', userController.getUser);
router.post('/logout', userController.logout);
router.post('/register', userController.register);
router.post('/activate/:activationtoken', userController.activateEmail);
router.post('/login', userController.login);
router.post('/refresh_token', userController.getAccessToken);
router.put('/update_user/:id', userController.updateUser);
router.delete('/delete/:id', userController.deleteUser);
router.post('/forgot', userController.forgotPassword);
router.post('/reset', auth, userController.resetPassword);

module.exports = router;