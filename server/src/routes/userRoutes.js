const router = require('express').Router();
const ctrl = require('../controllers/usersController');
const { authRequired } = require('../middleware/auth');

router.put('/me', authRequired, ctrl.updateMe);
router.delete('/me', authRequired, ctrl.deleteMe);
router.get('/:id', ctrl.getPublicProfile);

module.exports = router;
