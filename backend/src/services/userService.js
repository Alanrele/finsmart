const User = require('../models/userModel');
const Transaction = require('../models/transactionModel');

class UserService {
  async getUserProfile(userId) {
    try {
      const user = await User.findById(userId).select('-password -accessToken -refreshToken');
      if (!user) {
        throw new Error('User not found');
      }
      return user;
    } catch (error) {
      throw new Error(`Failed to get user profile: ${error.message}`);
    }
  }

  async updateUserProfile(userId, updates) {
    try {
      const allowedUpdates = ['firstName', 'lastName', 'preferences'];
      const filteredUpdates = {};

      Object.keys(updates).forEach(key => {
        if (allowedUpdates.includes(key)) {
          filteredUpdates[key] = updates[key];
        }
      });

      const user = await User.findByIdAndUpdate(
        userId,
        { $set: filteredUpdates },
        { new: true, runValidators: true }
      ).select('-password -accessToken -refreshToken');

      if (!user) {
        throw new Error('User not found');
      }

      return user;
    } catch (error) {
      throw new Error(`Failed to update user profile: ${error.message}`);
    }
  }

  async getUserStats(userId) {
    try {
      const now = new Date();
      const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

      // Current month stats
      const currentMonthTransactions = await Transaction.find({
        userId,
        date: { $gte: currentMonth }
      });

      const currentMonthSpending = currentMonthTransactions
        .filter(t => ['debit', 'payment', 'withdrawal'].includes(t.type))
        .reduce((sum, t) => sum + t.amount, 0);

      const currentMonthIncome = currentMonthTransactions
        .filter(t => ['credit', 'deposit'].includes(t.type))
        .reduce((sum, t) => sum + t.amount, 0);

      // Previous month stats for comparison
      const previousMonthTransactions = await Transaction.find({
        userId,
        date: {
          $gte: previousMonth,
          $lt: currentMonth
        }
      });

      const previousMonthSpending = previousMonthTransactions
        .filter(t => ['debit', 'payment', 'withdrawal'].includes(t.type))
        .reduce((sum, t) => sum + t.amount, 0);

      // Category breakdown
      const categoryStats = await Transaction.aggregate([
        {
          $match: {
            userId: userId,
            date: { $gte: currentMonth },
            type: { $in: ['debit', 'payment', 'withdrawal'] }
          }
        },
        {
          $group: {
            _id: '$category',
            totalAmount: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { totalAmount: -1 }
        }
      ]);

      // Total transactions count
      const totalTransactions = await Transaction.countDocuments({ userId });

      // Calculate spending change percentage
      const spendingChange = currentMonthSpending - previousMonthSpending;
      const spendingChangePercentage = previousMonthSpending > 0
        ? (spendingChange / previousMonthSpending) * 100
        : 0;

      return {
        currentMonth: {
          spending: currentMonthSpending,
          income: currentMonthIncome,
          balance: currentMonthIncome - currentMonthSpending,
          transactionCount: currentMonthTransactions.length
        },
        previousMonth: {
          spending: previousMonthSpending,
          transactionCount: previousMonthTransactions.length
        },
        comparison: {
          spendingChange,
          spendingChangePercentage: Math.round(spendingChangePercentage * 100) / 100
        },
        categoryStats,
        totalTransactions,
        lastSync: (await User.findById(userId)).lastSync
      };
    } catch (error) {
      throw new Error(`Failed to get user stats: ${error.message}`);
    }
  }

  async deleteUserData(userId) {
    try {
      // Delete all user transactions
      await Transaction.deleteMany({ userId });

      // Delete user account
      const user = await User.findByIdAndDelete(userId);

      if (!user) {
        throw new Error('User not found');
      }

      return { message: 'User data deleted successfully' };
    } catch (error) {
      throw new Error(`Failed to delete user data: ${error.message}`);
    }
  }

  async exportUserData(userId) {
    try {
      const user = await User.findById(userId).select('-password -accessToken -refreshToken');
      if (!user) {
        throw new Error('User not found');
      }

      const transactions = await Transaction.find({ userId }).sort({ date: -1 });

      return {
        user: user.toJSON(),
        transactions,
        exportDate: new Date(),
        transactionCount: transactions.length
      };
    } catch (error) {
      throw new Error(`Failed to export user data: ${error.message}`);
    }
  }

  async getUserNotifications(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const notifications = [];
      const now = new Date();

      // Check for spending alerts
      const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const currentMonthTransactions = await Transaction.find({
        userId,
        date: { $gte: currentMonth },
        type: { $in: ['debit', 'payment', 'withdrawal'] }
      });

      const currentSpending = currentMonthTransactions.reduce((sum, t) => sum + t.amount, 0);

      // Get previous month for comparison
      const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const previousMonthTransactions = await Transaction.find({
        userId,
        date: {
          $gte: previousMonth,
          $lt: currentMonth
        },
        type: { $in: ['debit', 'payment', 'withdrawal'] }
      });

      const previousSpending = previousMonthTransactions.reduce((sum, t) => sum + t.amount, 0);

      // High spending alert
      if (previousSpending > 0 && currentSpending > previousSpending * 1.2) {
        notifications.push({
          type: 'warning',
          title: 'Gasto Alto Detectado',
          message: `Tu gasto este mes es 20% mayor que el mes anterior (S/ ${currentSpending.toFixed(2)} vs S/ ${previousSpending.toFixed(2)})`,
          priority: 'high',
          date: now
        });
      }

      // Check for sync status
      if (!user.lastSync || (now - user.lastSync) > 7 * 24 * 60 * 60 * 1000) {
        notifications.push({
          type: 'info',
          title: 'Sincronización Pendiente',
          message: 'No has sincronizado tus correos en más de 7 días. Sincroniza para obtener las últimas transacciones.',
          priority: 'medium',
          date: now
        });
      }

      // Check for token expiry
      if (user.tokenExpiry && user.tokenExpiry < now) {
        notifications.push({
          type: 'error',
          title: 'Reconexión Requerida',
          message: 'Tu conexión con Microsoft Outlook ha expirado. Reconecta tu cuenta para continuar recibiendo actualizaciones.',
          priority: 'high',
          date: now
        });
      }

      return notifications;
    } catch (error) {
      throw new Error(`Failed to get user notifications: ${error.message}`);
    }
  }

  async markNotificationAsRead(userId, notificationId) {
    // This would be implemented if we store notifications in database
    // For now, notifications are generated dynamically
    return { message: 'Notification marked as read' };
  }
}

module.exports = new UserService();
