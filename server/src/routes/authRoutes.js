const router = require('express').Router();
const ctrl = require('../controllers/authController');
const { authRequired } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

router.post('/register', validate({
  name: { required: true },
  email: { required: true, type: 'email' },
  password: { required: true, minLength: 6 },
}), ctrl.register);

router.post('/login', validate({
  email: { required: true, type: 'email' },
  password: { required: true },
}), ctrl.login);

router.get('/me', authRequired, ctrl.me);

module.exports = router;
