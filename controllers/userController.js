const User = require('../models/User');
const QuizAttempt = require('../models/QuizAttempt');

// @route   PUT /api/users/profile
exports.updateProfile = async (req, res) => {
  try {
    const { age, educationLevel, fieldOfStudy, interests, avatarColor } = req.body;

    const updateData = {
      'profile.profileComplete': true
    };

    if (age) updateData['profile.age'] = age;
    if (educationLevel) updateData['profile.educationLevel'] = educationLevel;
    if (fieldOfStudy) updateData['profile.fieldOfStudy'] = fieldOfStudy;
    if (interests) updateData['profile.interests'] = interests;
    if (avatarColor) updateData['profile.avatarColor'] = avatarColor;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    res.json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        profile: user.profile
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @route   GET /api/users/stats
exports.getUserStats = async (req, res) => {
  try {
    const userId = req.user._id;

    const attempts = await QuizAttempt.find({ userId }).sort({ completedAt: -1 });

    const totalQuizzes = attempts.length;
    const totalQuestions = attempts.reduce((sum, a) => sum + a.totalQuestions, 0);
    const totalCorrect = attempts.reduce((sum, a) => sum + a.score, 0);
    const avgPercentage = totalQuizzes > 0
      ? Math.round(attempts.reduce((sum, a) => sum + a.percentage, 0) / totalQuizzes)
      : 0;

    // Category breakdown
    const categoryStats = {};
    attempts.forEach(attempt => {
      const cat = attempt.category;
      if (!categoryStats[cat]) {
        categoryStats[cat] = { total: 0, correct: 0, quizzes: 0 };
      }
      categoryStats[cat].total += attempt.totalQuestions;
      categoryStats[cat].correct += attempt.score;
      categoryStats[cat].quizzes += 1;
    });

    // Find strong & weak areas
    const areas = Object.entries(categoryStats).map(([category, stats]) => ({
      category,
      percentage: Math.round((stats.correct / stats.total) * 100),
      quizzes: stats.quizzes
    }));

    areas.sort((a, b) => b.percentage - a.percentage);
    const strongAreas = areas.filter(a => a.percentage >= 70).slice(0, 3);
    const weakAreas = areas.filter(a => a.percentage < 70).sort((a, b) => a.percentage - b.percentage).slice(0, 3);

    // Recent activity
    const recentAttempts = attempts.slice(0, 10).map(a => ({
      id: a._id,
      category: a.category,
      subcategory: a.subcategory,
      score: a.score,
      totalQuestions: a.totalQuestions,
      percentage: a.percentage,
      completedAt: a.completedAt
    }));

    // Streak calculation
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let streak = 0;
    const uniqueDays = new Set();
    attempts.forEach(a => {
      const d = new Date(a.completedAt);
      d.setHours(0, 0, 0, 0);
      uniqueDays.add(d.getTime());
    });
    const sortedDays = [...uniqueDays].sort((a, b) => b - a);
    for (let i = 0; i < sortedDays.length; i++) {
      const expected = new Date(today);
      expected.setDate(expected.getDate() - i);
      expected.setHours(0, 0, 0, 0);
      if (sortedDays[i] === expected.getTime()) {
        streak++;
      } else {
        break;
      }
    }

    res.json({
      totalQuizzes,
      totalQuestions,
      totalCorrect,
      avgPercentage,
      streak,
      strongAreas,
      weakAreas,
      categoryStats,
      recentAttempts
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
