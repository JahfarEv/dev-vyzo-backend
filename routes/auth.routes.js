const router = require('express').Router()
const authController = require('../controllers/auth.controller')

router.post('/doctor/login', authController.doctorLogin)
  .post('/admin/login', authController.adminLogin)

module.exports = router
