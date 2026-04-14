const express = require('express');
const router = express.Router();
const { requireRole, requirePermission } = require('../middleware/authMiddleware');
const {
  getMembers,
  getMember,
  createMember,
  updateMember,
  deleteMember,
  getPendingMembers,
  approveMember,
  rejectMember,
} = require('../controllers/memberController');

router.route('/').get(getMembers).post(createMember);
router.get('/pending', requireRole('super_admin'), getPendingMembers);
router.put('/:id/approve', requireRole('super_admin'), approveMember);
router.delete('/:id/reject', requireRole('super_admin'), rejectMember);
router.route('/:id').get(getMember).put(updateMember).delete(requirePermission('canDeleteMembers'), deleteMember);

module.exports = router;
