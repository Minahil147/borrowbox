const router = require('express').Router();
const ctrl = require('../controllers/itemsController');
const { authRequired } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

// NOTE: /mine must be defined before /:id
router.get('/mine', authRequired, ctrl.mine);
router.get('/', ctrl.list);
router.get('/:id/availability', ctrl.availability);
router.get('/:id', ctrl.getOne);

router.post('/', authRequired, validate({
  title: { required: true },
  category_id: { required: true, type: 'number' },
  max_days: { required: true, type: 'number' },
}), ctrl.create);

router.put('/:id', authRequired, ctrl.update);
router.delete('/:id', authRequired, ctrl.remove);

module.exports = router;
