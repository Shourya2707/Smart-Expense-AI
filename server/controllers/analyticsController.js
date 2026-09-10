const Expense = require("../models/Expense");
const Income = require("../models/Income");

// @desc    Get analytics data
// @route   GET /api/analytics
// @access  Private
exports.getAnalytics = async (req, res) => {
  try {
    const userId = req.user._id;

    // Fetch all income and expenses for the user
    const expenses = await Expense.find({ userId });
    const incomes = await Income.find({ userId });

    // Calculate totals
    const totalExpenses = expenses.reduce((acc, curr) => acc + curr.amount, 0);
    const totalIncome = incomes.reduce((acc, curr) => acc + curr.amount, 0);
    const currentBalance = totalIncome - totalExpenses;
    const totalTransactions = expenses.length + incomes.length;

    // Category-wise Expense
    const categoryWiseMap = {};
    expenses.forEach((exp) => {
      categoryWiseMap[exp.category] = (categoryWiseMap[exp.category] || 0) + exp.amount;
    });
    const categoryWiseExpense = Object.keys(categoryWiseMap).map(name => ({
      name,
      value: categoryWiseMap[name]
    }));

    // Monthly Income vs Expense
    const monthlyMap = {};
    const processMonthly = (records, type) => {
      records.forEach(record => {
        const d = new Date(record.date);
        const monthYear = `${d.toLocaleString('default', { month: 'short' })} ${d.getFullYear()}`;
        if (!monthlyMap[monthYear]) {
          monthlyMap[monthYear] = { month: monthYear, income: 0, expense: 0, sortKey: d.getFullYear() * 100 + d.getMonth() };
        }
        monthlyMap[monthYear][type] += record.amount;
      });
    };
    
    processMonthly(incomes, 'income');
    processMonthly(expenses, 'expense');

    const monthlyIncomeExpense = Object.values(monthlyMap).sort((a, b) => a.sortKey - b.sortKey).map(({ sortKey, ...rest }) => rest);

    // Highest Expense Category
    let highestExpenseCategory = "None";
    let maxExp = 0;
    for (const cat in categoryWiseMap) {
      if (categoryWiseMap[cat] > maxExp) {
        maxExp = categoryWiseMap[cat];
        highestExpenseCategory = cat;
      }
    }

    // Highest Income Source
    const sourceWiseMap = {};
    incomes.forEach((inc) => {
      sourceWiseMap[inc.source] = (sourceWiseMap[inc.source] || 0) + inc.amount;
    });
    let highestIncomeSource = "None";
    let maxInc = 0;
    for (const src in sourceWiseMap) {
      if (sourceWiseMap[src] > maxInc) {
        maxInc = sourceWiseMap[src];
        highestIncomeSource = src;
      }
    }

    res.status(200).json({
      success: true,
      data: {
        totalIncome,
        totalExpenses,
        currentBalance,
        totalTransactions,
        categoryWiseExpense,
        monthlyIncomeExpense,
        highestExpenseCategory,
        highestIncomeSource
      }
    });
  } catch (error) {
    console.error("Get Analytics Error:", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
