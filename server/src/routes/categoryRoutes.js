const router = require('express').Router();
const ctrl = require('../controllers/categoriesController');
const { authRequired } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const { validate } = require('../middleware/validate');

router.get('/', ctrl.list);
router.post('/', authRequired, requireRole('admin'), validate({ name: { required: true } }), ctrl.create);
router.put('/:id', authRequired, requireRole('admin'), validate({ name: { required: true } }), ctrl.update);
router.delete('/:id', authRequired, requireRole('admin'), ctrl.remove);

module.exports = router;
