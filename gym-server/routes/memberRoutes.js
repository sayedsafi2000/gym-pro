const express = require('express');
const router = express.Router();
const { requireRole, requirePermission } = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');
const schemas = require('../schemas');
const {
  getMembers,
  getMember,
  createMember,
  getLastMemberId,
  updateMember,
  deleteMember,
  getPendingMembers,
  approveMember,
  rejectMember,
} = require('../controllers/memberController');

router.route('/').get(getMembers).post(validate(schemas.createMember), createMember);
router.get('/last-id', getLastMemberId);
router.get('/pending', requireRole('super_admin'), getPendingMembers);
router.put('/:id/approve', requireRole('super_admin'), approveMember);
router.delete('/:id/reject', requireRole('super_admin'), rejectMember);
router.route('/:id').get(getMember).put(updateMember).delete(requirePermission('canDeleteMembers'), deleteMember);

module.exports = router;
