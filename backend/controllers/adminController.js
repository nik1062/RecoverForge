const User = require('../models/User');
const Transaction = require('../models/Transaction');

// @desc  Get platform overview stats
// @route GET /admin/stats
const getStats = async (req, res, next) => {
  try {
    const [totalUsers, verifiedUsers, premiumUsers, totalRevenue] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isVerified: true }),
      User.countDocuments({ plan: 'premium' }),
      Transaction.aggregate([
        { $match: { status: 'success' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ])
    ]);

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const newUsersThisWeek = await User.countDocuments({ createdAt: { $gte: sevenDaysAgo } });

    // Daily signups for chart (last 7 days)
    const dailySignups = await User.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        verifiedUsers,
        premiumUsers,
        totalRevenue: totalRevenue[0]?.total || 0, // In paise
        newUsersThisWeek,
        dailySignups
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc  Get all users
// @route GET /admin/users
const getUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search = '', verified = '', plan = '' } = req.query;
    const query = { isAdmin: { $ne: true } };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    if (verified === 'true') query.isVerified = true;
    if (verified === 'false') query.isVerified = false;
    if (plan) query.plan = plan;

    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .select('-password -otp -otpExpiry');

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      data: users,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    next(error);
  }
};

// @desc  Get user detail
// @route GET /admin/users/:id
const getUserDetail = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password -otp -otpExpiry');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const transactions = await Transaction.find({ userId: user._id }).sort({ createdAt: -1 }).limit(5);

    res.status(200).json({ success: true, data: { user, transactions } });
  } catch (error) {
    next(error);
  }
};

// @desc  Update user (ban, verify, plan, credits)
// @route PUT /admin/users/:id
const updateUser = async (req, res, next) => {
  try {
    const { isVerified, isBanned, plan, credits } = req.body;
    
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) return res.status(404).json({ success: false, message: 'User not found' });
    if (targetUser.isAdmin) return res.status(403).json({ success: false, message: 'Cannot modify admin account' });

    const updateData = {};
    if (isVerified !== undefined) updateData.isVerified = isVerified;
    if (isBanned !== undefined) updateData.isBanned = isBanned;
    if (plan) updateData.plan = plan;
    if (credits !== undefined) updateData.credits = credits;

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password -otp -otpExpiry');

    res.status(200).json({ success: true, message: 'User updated', data: updatedUser });
  } catch (error) {
    next(error);
  }
};

// @desc  Get all transactions
// @route GET /admin/transactions
const getTransactions = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const transactions = await Transaction.find()
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Transaction.countDocuments();

    res.status(200).json({
      success: true,
      data: transactions,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getStats, getUsers, getUserDetail, updateUser, getTransactions };
