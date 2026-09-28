const router = require('express').Router();
const ctrl = require('../controllers/adminController');
const { authRequired } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

router.use(authRequired, requireRole('admin'));

router.get('/stats', ctrl.stats);
router.get('/users', ctrl.listUsers);
router.patch('/users/:id/status', ctrl.setUserStatus);

module.exports = router;
