const express = require('express');
const router = express.Router();
const {
  getDevices,
  getDevice,
  createDevice,
  updateDevice,
  deleteDevice,
  getDeviceStatus,
  registerUser,
  getDeviceUsers,
  linkUser,
} = require('../controllers/deviceController');

router.route('/').get(getDevices).post(createDevice);
router.route('/:id').get(getDevice).put(updateDevice).delete(deleteDevice);
router.get('/:id/status', getDeviceStatus);
router.post('/:id/register-user', registerUser);
router.post('/:id/link-user', linkUser);
router.get('/:id/users', getDeviceUsers);

module.exports = router;
