const express = require('express');
const { create, getAll } = require('../controllers/assetController');
const router = express.Router();

router.post('/', create);
router.get('/', getAll);

module.exports = router;
