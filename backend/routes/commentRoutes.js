const express = require('express');
const router = express.Router();
const {updateComment, deleteComment, voteComment, getCommentsByUser} = require('../controllers/commentController');
const { protect, optionalProtect } = require('../middleware/authMiddleware');

router.get('/user/:userId', optionalProtect, getCommentsByUser);
router.patch('/:commentId', protect, updateComment);
router.delete('/:commentId', protect, deleteComment);
router.post('/:commentId/vote', protect, voteComment);

module.exports = router;