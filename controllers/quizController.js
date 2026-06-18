const Question = require('../models/Question');
const QuizAttempt = require('../models/QuizAttempt');
const User = require('../models/User');

// @route   GET /api/quiz/categories
exports.getCategories = async (req, res) => {
  try {
    const categories = await Question.aggregate([
      {
        $group: {
          _id: { category: '$category', subcategory: '$subcategory' },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.category',
          subcategories: {
            $push: {
              name: '$_id.subcategory',
              count: '$count'
            }
          },
          totalCount: { $sum: '$count' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const result = categories.map(c => ({
      category: c._id,
      totalQuestions: c.totalCount,
      subcategories: c.subcategories.sort((a, b) => a.name.localeCompare(b.name))
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @route   POST /api/quiz/generate
exports.generateQuiz = async (req, res) => {
  try {
    const { category, subcategory, difficulty, count = 10, careerPath } = req.body;

    const filter = {};
    if (category) filter.category = category;
    if (subcategory) filter.subcategory = subcategory;
    if (difficulty) filter.difficulty = difficulty;
    if (careerPath && careerPath !== 'General') filter.careerPath = careerPath;

    // Get questions user hasn't attempted recently
    const recentAttempts = await QuizAttempt.find({ userId: req.user._id })
      .sort({ completedAt: -1 })
      .limit(5);

    const recentQuestionIds = recentAttempts.flatMap(a => 
      a.questions.map(q => q.questionId)
    );

    // Try to get non-repeated questions first
    let questions = await Question.aggregate([
      { $match: { ...filter, _id: { $nin: recentQuestionIds } } },
      { $sample: { size: parseInt(count) } }
    ]);

    // If not enough, fill with any matching questions
    if (questions.length < count) {
      questions = await Question.aggregate([
        { $match: filter },
        { $sample: { size: parseInt(count) } }
      ]);
    }

    if (questions.length === 0) {
      return res.status(404).json({ message: 'No questions found for this category' });
    }

    // Don't send correct answers to client
    const quizQuestions = questions.map(q => ({
      _id: q._id,
      questionText: q.questionText,
      options: q.options,
      difficulty: q.difficulty,
      category: q.category,
      subcategory: q.subcategory
    }));

    res.json({
      quizId: Date.now().toString(36),
      category: category || 'Mixed',
      subcategory: subcategory || 'General',
      totalQuestions: quizQuestions.length,
      timePerQuestion: 30,
      questions: quizQuestions
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @route   POST /api/quiz/submit
exports.submitQuiz = async (req, res) => {
  try {
    const { category, subcategory, answers } = req.body;
    // answers: [{ questionId, selectedAnswer, timeTaken }]

    if (!answers || answers.length === 0) {
      return res.status(400).json({ message: 'No answers provided' });
    }

    const questionIds = answers.map(a => a.questionId);
    const questions = await Question.find({ _id: { $in: questionIds } });

    const questionMap = {};
    questions.forEach(q => { questionMap[q._id.toString()] = q; });

    let score = 0;
    const processedQuestions = answers.map(answer => {
      const question = questionMap[answer.questionId];
      if (!question) return null;

      const isCorrect = question.correctAnswer === answer.selectedAnswer;
      if (isCorrect) score++;

      return {
        questionId: question._id,
        questionText: question.questionText,
        options: question.options,
        correctAnswer: question.correctAnswer,
        selectedAnswer: answer.selectedAnswer,
        isCorrect,
        timeTaken: answer.timeTaken || 0,
        explanation: question.explanation
      };
    }).filter(Boolean);

    const totalQuestions = processedQuestions.length;
    const percentage = Math.round((score / totalQuestions) * 100);

    const attempt = await QuizAttempt.create({
      userId: req.user._id,
      category: category || 'Mixed',
      subcategory: subcategory || 'General',
      questions: processedQuestions,
      score,
      totalQuestions,
      percentage,
      timeSpent: answers.reduce((sum, a) => sum + (a.timeTaken || 0), 0)
    });

    res.json({
      attemptId: attempt._id,
      score,
      totalQuestions,
      percentage,
      questions: processedQuestions
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @route   GET /api/quiz/history
exports.getHistory = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const attempts = await QuizAttempt.find({ userId: req.user._id })
      .sort({ completedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await QuizAttempt.countDocuments({ userId: req.user._id });

    res.json({
      attempts: attempts.map(a => ({
        id: a._id,
        category: a.category,
        subcategory: a.subcategory,
        score: a.score,
        totalQuestions: a.totalQuestions,
        percentage: a.percentage,
        timeSpent: a.timeSpent,
        completedAt: a.completedAt
      })),
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @route   GET /api/quiz/attempt/:id
exports.getAttemptDetails = async (req, res) => {
  try {
    const attempt = await QuizAttempt.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!attempt) {
      return res.status(404).json({ message: 'Attempt not found' });
    }

    res.json(attempt);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @route   GET /api/leaderboard
exports.getLeaderboard = async (req, res) => {
  try {
    const { category, timeframe = 'all' } = req.query;

    const matchStage = {};
    if (category) matchStage.category = category;

    if (timeframe === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      matchStage.completedAt = { $gte: weekAgo };
    } else if (timeframe === 'month') {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      matchStage.completedAt = { $gte: monthAgo };
    }

    const leaderboard = await QuizAttempt.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$userId',
          totalQuizzes: { $sum: 1 },
          totalScore: { $sum: '$score' },
          totalQuestions: { $sum: '$totalQuestions' },
          avgPercentage: { $avg: '$percentage' }
        }
      },
      { $sort: { avgPercentage: -1, totalQuizzes: -1 } },
      { $limit: 50 }
    ]);

    // Populate usernames
    const userIds = leaderboard.map(l => l._id);
    const users = await User.find({ _id: { $in: userIds } }).select('username profile.avatarColor');
    const userMap = {};
    users.forEach(u => { userMap[u._id.toString()] = u; });

    const result = leaderboard.map((entry, index) => {
      const user = userMap[entry._id.toString()];
      return {
        rank: index + 1,
        userId: entry._id,
        username: user ? user.username : 'Unknown',
        avatarColor: user?.profile?.avatarColor || '#7c3aed',
        totalQuizzes: entry.totalQuizzes,
        totalScore: entry.totalScore,
        totalQuestions: entry.totalQuestions,
        avgPercentage: Math.round(entry.avgPercentage)
      };
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
