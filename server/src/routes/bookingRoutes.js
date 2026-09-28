const router = require('express').Router();
const ctrl = require('../controllers/bookingsController');
const reviewsCtrl = require('../controllers/reviewsController');
const { authRequired } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

router.get('/mine', authRequired, ctrl.mine);
router.get('/incoming', authRequired, ctrl.incoming);

router.post('/', authRequired, validate({
  item_id: { required: true, type: 'number' },
  start_date: { required: true },
  end_date: { required: true },
}), ctrl.create);

router.get('/:id', authRequired, ctrl.getOne);
router.put('/:id', authRequired, ctrl.update);
router.delete('/:id', authRequired, ctrl.remove);
router.patch('/:id/status', authRequired, ctrl.changeStatus);

router.post('/:id/reviews', authRequired, validate({
  rating: { required: true, type: 'number' },
}), reviewsCtrl.create);

module.exports = router;
