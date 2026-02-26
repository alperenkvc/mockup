const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadMiddleware');
const {createPost, verifyAsNews, getNews, getFeed, getPostById, getUserDrafts, castPollVote, castVote, deletePost, moderatorDeletePost, toggleSavePost, getSavedPosts, getPostsByUser} = require('../controllers/postController');
const {addComment, getCommentsForPost} = require('../controllers/commentController');
const { protect, optionalProtect, isAdmin } = require('../middleware/authMiddleware');
const { isModerator } = require('../middleware/communityAuthMiddleware');

router.post('/submit', protect, upload.single('image'), createPost);
router.post('/verify-news/:id', protect, isAdmin, verifyAsNews);
router.get('/news', optionalProtect, getNews);
router.get('/feed', optionalProtect, getFeed);
router.get('/drafts', protect, getUserDrafts);
router.get('/user/:userId', optionalProtect, getPostsByUser);
router.get('/saved', protect, getSavedPosts);
router.get('/:postId', optionalProtect, getPostById);
router.post('/:postId/poll-vote', protect, castPollVote);
router.post('/:postId/vote', protect, castVote);
router.delete('/:postId', protect, deletePost);
router.delete('/:postId/moderator-delete', protect, moderatorDeletePost);

//Comment related
router.post('/:postId/comment', protect, upload.single('comment_media'), addComment);
router.get('/:postId/comments', optionalProtect, getCommentsForPost);

//Saved posts related
router.post('/:postId/toggle-save', protect, toggleSavePost);


module.exports = router;