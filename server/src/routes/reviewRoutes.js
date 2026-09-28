const router = require('express').Router();
const ctrl = require('../controllers/reviewsController');
const { authRequired } = require('../middleware/auth');

router.put('/:id', authRequired, ctrl.update);
router.delete('/:id', authRequired, ctrl.remove);

module.exports = router;
