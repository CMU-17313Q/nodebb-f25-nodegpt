'use strict';

const express = require('express');
const router = express.Router();

const Posts = require.main.require('./src/posts'); // hypothetical post handling module
const Polls = require.main.require('./src/polls/model');
const db = require.main.require('.database');

// helper to validate poll payload
function validatePoll(poll) {
  if (!poll) return 'Poll data is required';
  if (typeof poll.question !== 'string' || poll.question.trim() === '') {
    return 'Poll question must be a non-empty string';
  }
  if (!Array.isArray(poll.options)) {
    return 'Poll options must be an array';
  }
  if (poll.options.length < 2 || poll.options.length > 4) {
    return 'Poll must have between 2 and 4 options';
  }
  for (const option of poll.options) {
    if (typeof option !== 'string' || option.trim() === '') {
      return 'Poll options cannot be empty strings';
    }
  }
  return null;
}

// POST /api/announcement-with-poll
router.post('/api/announcement-with-poll', async (req, res) => {
  const { postContent, poll } = req.body;
  const userId = req.user?.id; // assuming user from authentication middleware

  if (!postContent || typeof postContent !== 'string' || postContent.trim() === '') {
    return res.status(400).json({ error: 'Post content is required' });
  }

  // Validate poll
  const pollError = validatePoll(poll);
  if (pollError) {
    return res.status(400).json({ error: pollError });
  }

  try {
    // Assuming Posts.createPost returns new post object with id
    const post = await Posts.createPost({
      content: postContent,
      createdBy: userId,
      isAnnouncement: true,
    });

    // Create poll linked to this post
    const createdPoll = await Polls.createPoll({
      postId: post.id,
      question: poll.question.trim(),
      options: poll.options.map((o) => o.trim()),
      createdBy: userId,
      closesAt: poll.closesAt || null,
    });

    // Return post response including poll metadata
    return res.status(201).json({
      postId: post.id,
      poll: {
        id: createdPoll.pollId,
        question: createdPoll.question,
        optionsCount: createdPoll.options.length,
      },
    });
  } catch (err) {
    console.error('Failed to create announcement with poll:', err);
    if (err.message.includes('Invalid poll')) {
      return res.status(400).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;